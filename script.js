// =============================================
// Buraco Negro Interativo - script.js (versão cinematográfica + comparação)
// =============================================

const canvas = document.getElementById('blackholeCanvas');
const ctx = canvas.getContext('2d');
const massaSlider = document.getElementById('massa-slider');
const spinSlider = document.getElementById('spin-slider');
const massaValor = document.getElementById('massa-valor');
const spinValor = document.getElementById('spin-valor');
const btnAnimar = document.getElementById('btn-animar');
const btnReset = document.getElementById('btn-reset');
const resultadoDiv = document.getElementById('resultado');
const botoesAstros = document.querySelectorAll('.astro-btn');
const btnLimparAstros = document.getElementById('btn-limpar-astros');

let massaSolar = 10; // massa real (10^slider)
let spin = 0.5;
let animacaoAtiva = true;
let arrastandoBH = false;
let arrastandoAstro = null;
let offsetX = 0, offsetY = 0;

let bhX = canvas.width / 2;
let bhY = canvas.height / 2;

let estrelasFundo = [];
let particulasAcrecao = [];
let anguloDisco = 0;
let astrosAdicionados = []; // {nome, raioKm, cor, x, y, raioPx, limiteEscala}

const KM_POR_MASSA_SOLAR = 2.95;
const MASSA_SOL_KG = 1.989e30;

// ===== FUNÇÕES DE ESCALA =====
function escalaVisual(massa) {
  // Ajuste para dar destaque: cresce mais devagar, mas bem maior
  return Math.pow(massa, 0.6) * 6;
}

function getRaioSchwarzschildKm(massa) {
  return KM_POR_MASSA_SOLAR * massa;
}

function getKmPorPixel(massa) {
  const raioPx = escalaVisual(massa);
  const raioKm = getRaioSchwarzschildKm(massa);
  return raioKm / raioPx;
}

// ===== INICIALIZAÇÃO =====
function init() {
  // Estrelas de fundo
  for (let i = 0; i < 400; i++) {
    const brilho = Math.random() * 0.8 + 0.2;
    const cor = Math.random() > 0.7 ? 'rgba(180,200,255,' : 'rgba(255,255,255,';
    estrelasFundo.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      raio: Math.random() * 1.8 + 0.5,
      brilho: brilho,
      cor: cor + brilho + ')'
    });
  }

  // Partículas de acreção
  for (let i = 0; i < 250; i++) {
    criarParticula();
  }

  // Slider de massa em escala logarítmica
  massaSlider.addEventListener('input', function() {
    const expoente = parseFloat(this.value);
    massaSolar = Math.pow(10, expoente);
    // Limita a 1.000.000 para não extrapolar
    if (massaSolar > 1e6) massaSolar = 1e6;
    atualizarCalculos();
  });
  // Define valor inicial (10^1 = 10)
  massaSlider.value = 1;
  massaSolar = 10;
  atualizarCalculos();

  spinSlider.addEventListener('input', function() {
    spin = parseFloat(this.value);
    atualizarCalculos();
  });

  btnAnimar.addEventListener('click', function() {
    animacaoAtiva = !animacaoAtiva;
    btnAnimar.textContent = animacaoAtiva ? 'Pausar' : 'Animar';
  });

  btnReset.addEventListener('click', function() {
    bhX = canvas.width / 2;
    bhY = canvas.height / 2;
  });

  // Botões de astros
  botoesAstros.forEach(btn => {
    btn.addEventListener('click', function() {
      const nome = this.dataset.nome;
      const raioKm = parseFloat(this.dataset.raio);
      const cor = this.dataset.cor;
      adicionarAstro(nome, raioKm, cor);
    });
  });

  btnLimparAstros.addEventListener('click', function() {
    astrosAdicionados = [];
  });

  // Eventos de arrasto para buraco negro e astros
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseUp);

  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);

  requestAnimationFrame(draw);
}

function criarParticula() {
  const raioInicial = Math.random() * 400 + 100;
  const anguloInicial = Math.random() * Math.PI * 2;
  const velocidadeAngular = (Math.random() * 0.03 + 0.005) * (Math.random() > 0.5 ? 1 : -1);
  const velocidadeRadial = Math.random() * 0.25 + 0.05;
  const cor = `hsl(${Math.random() * 50 + 15}, 100%, ${Math.random() * 30 + 50}%)`;
  particulasAcrecao.push({
    raio: raioInicial,
    angulo: anguloInicial,
    velAngular: velocidadeAngular,
    velRadial: velocidadeRadial,
    raioParticula: Math.random() * 2.5 + 1,
    cor: cor,
    trail: []
  });
}

function adicionarAstro(nome, raioKm, cor) {
  const kmPorPixel = getKmPorPixel(massaSolar);
  let raioPx = raioKm / kmPorPixel;
  let limiteEscala = false;
  // Limita tamanho máximo para caber na tela
  if (raioPx > 150) {
    raioPx = 150;
    limiteEscala = true;
  } else if (raioPx < 1) {
    raioPx = 2; // mínimo visível
    limiteEscala = true;
  }
  // Posição inicial à direita do buraco negro
  const espaco = escalaVisual(massaSolar) + raioPx + 30;
  const novoAstro = {
    nome,
    raioKm,
    cor,
    raioPx,
    limiteEscala,
    x: bhX + espaco,
    y: bhY
  };
  astrosAdicionados.push(novoAstro);
}

function atualizarCalculos() {
  massaValor.textContent = massaSolar >= 1000 ? massaSolar.toExponential(1) : massaSolar;
  spinValor.textContent = spin.toFixed(2);

  const raioKm = getRaioSchwarzschildKm(massaSolar);
  const raioM = raioKm * 1000;
  const massaKg = massaSolar * MASSA_SOL_KG;
  const volume = (4/3) * Math.PI * Math.pow(raioM, 3);
  const densidade = massaKg / volume;
  const densidadeAgua = 1000;
  const comparacao = densidade / densidadeAgua;
  const tempHawking = (6.17e-8) / massaSolar;
  const a = spin * massaSolar;
  const rHorizonte = massaSolar + Math.sqrt(massaSolar*massaSolar - a*a);

  resultadoDiv.innerHTML = `
    🔭 <strong>Propriedades do Buraco Negro</strong>
    ----------------------------------------
    Massa: ${massaSolar} M☉ (${massaKg.toExponential(3)} kg)
    Spin: ${spin.toFixed(2)}
    Raio de Schwarzschild: ${raioKm.toFixed(2)} km
    Raio do horizonte (Kerr): ${rHorizonte.toFixed(2)} km
    Densidade média: ${densidade.toExponential(3)} kg/m³
    Densidade vs água: ${comparacao.toExponential(2)}x
    Temperatura Hawking: ${tempHawking.toExponential(3)} K
  `;

  // Recalcula tamanho dos astros se houver
  if (astrosAdicionados.length > 0) {
    const kmPorPixel = getKmPorPixel(massaSolar);
    for (const astro of astrosAdicionados) {
      let novoRaioPx = astro.raioKm / kmPorPixel;
      astro.limiteEscala = false;
      if (novoRaioPx > 150) {
        novoRaioPx = 150;
        astro.limiteEscala = true;
      } else if (novoRaioPx < 2) {
        novoRaioPx = 2;
        astro.limiteEscala = true;
      }
      astro.raioPx = novoRaioPx;
    }
  }
}

// ===== LOOP DE ANIMAÇÃO =====
function draw() {
  if (animacaoAtiva) {
    anguloDisco += 0.012;
    // Atualiza partículas com aceleração de sucção
    const raioBH = escalaVisual(massaSolar);
    for (let i = particulasAcrecao.length - 1; i >= 0; i--) {
      const p = particulasAcrecao[i];
      // Quanto mais perto, mais rápido (simula atração gravitacional)
      const fatorAceleracao = 1 + (1 - Math.min(p.raio / 400, 1)) * 3;
      p.angulo += p.velAngular * fatorAceleracao;
      p.raio -= p.velRadial * fatorAceleracao;

      if (p.raio < raioBH * 0.8) {
        particulasAcrecao.splice(i, 1);
        criarParticula();
        continue;
      }

      // Atualiza trail
      p.trail.push({x: bhX + Math.cos(p.angulo) * p.raio, y: bhY + Math.sin(p.angulo) * p.raio * 0.4});
      if (p.trail.length > 8) p.trail.shift();
    }
  }
  desenharCena();
  requestAnimationFrame(draw);
}

function desenharCena() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  desenharEstrelasComLente();

  const raioBH = escalaVisual(massaSolar);
  const achatamento = 1 - 0.25 * spin;

  desenharDiscoAcrecao(raioBH, raioBH * achatamento);

  // Partículas com trail
  for (const p of particulasAcrecao) {
    if (p.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(p.trail[0].x, p.trail[0].y);
      for (let j = 1; j < p.trail.length; j++) {
        ctx.lineTo(p.trail[j].x, p.trail[j].y);
      }
      ctx.strokeStyle = p.cor;
      ctx.lineWidth = p.raioParticula * 0.5;
      ctx.globalAlpha = 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const x = bhX + Math.cos(p.angulo) * p.raio;
    const y = bhY + Math.sin(p.angulo) * p.raio * 0.4;
    ctx.beginPath();
    ctx.arc(x, y, p.raioParticula, 0, Math.PI * 2);
    ctx.fillStyle = p.cor;
    ctx.fill();
  }

  // Horizonte de eventos cinematográfico
  ctx.save();
  ctx.translate(bhX, bhY);
  ctx.scale(1, achatamento);

  // Sombra interna
  const gradSombra = ctx.createRadialGradient(0, 0, raioBH * 0.5, 0, 0, raioBH);
  gradSombra.addColorStop(0, 'rgba(0,0,0,1)');
  gradSombra.addColorStop(0.8, 'rgba(0,0,0,0.9)');
  gradSombra.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(0, 0, raioBH, 0, Math.PI * 2);
  ctx.fillStyle = gradSombra;
  ctx.fill();

  // Anel de fótons (brilhante)
  ctx.shadowColor = 'rgba(255, 180, 50, 0.9)';
  ctx.shadowBlur = 40;
  ctx.beginPath();
  ctx.arc(0, 0, raioBH, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 220, 150, 0.9)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Brilho interno
  const gradCentral = ctx.createRadialGradient(0, 0, raioBH * 0.2, 0, 0, raioBH * 1.2);
  gradCentral.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
  gradCentral.addColorStop(0.5, 'rgba(255, 200, 100, 0.1)');
  gradCentral.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(0, 0, raioBH * 1.2, 0, Math.PI * 2);
  ctx.fillStyle = gradCentral;
  ctx.fill();

  ctx.restore();

  // Desenha astros adicionados
  for (const astro of astrosAdicionados) {
    desenharAstro(astro);
  }
}

function desenharEstrelasComLente() {
  const raioBH = escalaVisual(massaSolar);
  const raioInfluencia = raioBH * 5;

  for (const estrela of estrelasFundo) {
    const dx = estrela.x - bhX;
    const dy = estrela.y - bhY;
    const dist = Math.sqrt(dx*dx + dy*dy);

    let x = estrela.x;
    let y = estrela.y;
    let brilho = estrela.brilho;

    if (dist < raioInfluencia) {
      const fator = (1 - dist / raioInfluencia) * 25;
      if (dist > 0.1) {
        const desvioX = (dx / dist) * fator;
        const desvioY = (dy / dist) * fator;
        x = estrela.x - desvioX;
        y = estrela.y - desvioY;
      }
      brilho = Math.min(1, estrela.brilho + (1 - dist / raioInfluencia) * 0.7);
    }

    ctx.beginPath();
    ctx.arc(x, y, estrela.raio, 0, Math.PI * 2);
    ctx.fillStyle = estrela.cor;
    ctx.globalAlpha = brilho;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function desenharDiscoAcrecao(raioHorizontal, raioVertical) {
  const aneis = 8;
  for (let i = 0; i < aneis; i++) {
    const raioAnel = raioHorizontal * (1.2 + i * 0.3);
    const velRotacao = anguloDisco * (1 + (1 - i / aneis) * 2 + spin * 0.8);
    ctx.save();
    ctx.translate(bhX, bhY);
    ctx.rotate(velRotacao);
    ctx.beginPath();
    ctx.ellipse(0, 0, raioAnel, raioAnel * 0.35, 0, 0, Math.PI * 2);
    const grad = ctx.createLinearGradient(-raioAnel, 0, raioAnel, 0);
    grad.addColorStop(0, 'rgba(255, 80, 0, 0.9)');
    grad.addColorStop(0.3, 'rgba(255, 200, 50, 0.8)');
    grad.addColorStop(0.5, 'rgba(255, 255, 200, 0.9)');
    grad.addColorStop(0.7, 'rgba(255, 180, 30, 0.8)');
    grad.addColorStop(1, 'rgba(255, 80, 0, 0.9)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 10 + i * 2;
    ctx.shadowColor = 'rgba(255, 150, 0, 0.6)';
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.restore();
  }
}

function desenharAstro(astro) {
  ctx.save();
  ctx.translate(astro.x, astro.y);
  // Gradiente para dar volume
  const grad = ctx.createRadialGradient(-astro.raioPx*0.3, -astro.raioPx*0.3, astro.raioPx*0.1, 0, 0, astro.raioPx);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.5, astro.cor);
  grad.addColorStop(1, '#000000');
  ctx.beginPath();
  ctx.arc(0, 0, astro.raioPx, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  // Borda sutil
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Nome do astro
  ctx.fillStyle = '#fff';
  ctx.font = '12px Segoe UI';
  ctx.textAlign = 'center';
  ctx.fillText(astro.nome, 0, astro.raioPx + 15);
  if (astro.limiteEscala) {
    ctx.fillStyle = '#ffaa00';
    ctx.font = '10px Segoe UI';
    ctx.fillText('(escala limitada)', 0, astro.raioPx + 28);
  }
  ctx.restore();
}

// ===== INTERAÇÕES DE ARRASTO =====
function obterPosicaoMouse(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function onMouseDown(e) {
  const pos = obterPosicaoMouse(e);
  // Verifica se clicou em um astro
  for (const astro of astrosAdicionados) {
    const dx = pos.x - astro.x;
    const dy = pos.y - astro.y;
    if (Math.sqrt(dx*dx + dy*dy) < astro.raioPx + 10) {
      arrastandoAstro = astro;
      arrastandoBH = false;
      offsetX = dx;
      offsetY = dy;
      canvas.style.cursor = 'grabbing';
      return;
    }
  }
  // Verifica buraco negro
  const raioArrasto = escalaVisual(massaSolar) * 1.5;
  const dx = pos.x - bhX;
  const dy = pos.y - bhY;
  if (Math.sqrt(dx*dx + dy*dy) < raioArrasto) {
    arrastandoBH = true;
    arrastandoAstro = null;
    offsetX = dx;
    offsetY = dy;
    canvas.style.cursor = 'grabbing';
  }
}

function onMouseMove(e) {
  const pos = obterPosicaoMouse(e);
  if (arrastandoBH) {
    bhX = pos.x - offsetX;
    bhY = pos.y - offsetY;
    bhX = Math.max(30, Math.min(canvas.width - 30, bhX));
    bhY = Math.max(30, Math.min(canvas.height - 30, bhY));
  } else if (arrastandoAstro) {
    arrastandoAstro.x = pos.x - offsetX;
    arrastandoAstro.y = pos.y - offsetY;
    arrastandoAstro.x = Math.max(arrastandoAstro.raioPx, Math.min(canvas.width - arrastandoAstro.raioPx, arrastandoAstro.x));
    arrastandoAstro.y = Math.max(arrastandoAstro.raioPx, Math.min(canvas.height - arrastandoAstro.raioPx, arrastandoAstro.y));
  }
}

function onMouseUp() {
  arrastandoBH = false;
  arrastandoAstro = null;
  canvas.style.cursor = 'grab';
}

// Suporte a touch
function onTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const pos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  // Astros
  for (const astro of astrosAdicionados) {
    const dx = pos.x - astro.x;
    const dy = pos.y - astro.y;
    if (Math.sqrt(dx*dx + dy*dy) < astro.raioPx + 10) {
      arrastandoAstro = astro;
      arrastandoBH = false;
      offsetX = dx;
      offsetY = dy;
      return;
    }
  }
  // BH
  const raioArrasto = escalaVisual(massaSolar) * 1.5;
  const dx = pos.x - bhX;
  const dy = pos.y - bhY;
  if (Math.sqrt(dx*dx + dy*dy) < raioArrasto) {
    arrastandoBH = true;
    offsetX = dx;
    offsetY = dy;
  }
}

function onTouchMove(e) {
  e.preventDefault();
  if (arrastandoBH || arrastandoAstro) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const pos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    if (arrastandoBH) {
      bhX = pos.x - offsetX;
      bhY = pos.y - offsetY;
      bhX = Math.max(30, Math.min(canvas.width - 30, bhX));
      bhY = Math.max(30, Math.min(canvas.height - 30, bhY));
    } else if (arrastandoAstro) {
      arrastandoAstro.x = pos.x - offsetX;
      arrastandoAstro.y = pos.y - offsetY;
      arrastandoAstro.x = Math.max(arrastandoAstro.raioPx, Math.min(canvas.width - arrastandoAstro.raioPx, arrastandoAstro.x));
      arrastandoAstro.y = Math.max(arrastandoAstro.raioPx, Math.min(canvas.height - arrastandoAstro.raioPx, arrastandoAstro.y));
    }
  }
}

function onTouchEnd() {
  arrastandoBH = false;
  arrastandoAstro = null;
}

// ===== INICIAR =====
init();
