// =============================================
// Buraco Negro Interativo - script.js
// (inclui seleção de buracos negros reais)
// =============================================

const canvas = document.getElementById('blackholeCanvas');
const ctx = canvas.getContext('2d');
const miniCanvas = document.getElementById('comparacaoCanvas');
const miniCtx = miniCanvas.getContext('2d');

const massaSlider = document.getElementById('massa-slider');
const spinSlider = document.getElementById('spin-slider');
const massaValor = document.getElementById('massa-valor');
const spinValor = document.getElementById('spin-valor');
const btnAnimar = document.getElementById('btn-animar');
const btnReset = document.getElementById('btn-reset');
const resultadoDiv = document.getElementById('resultado');
const botoesAstros = document.querySelectorAll('.astro-btn');
const btnLimparAstros = document.getElementById('btn-limpar-astros');
const botoesBHs = document.querySelectorAll('.bh-btn');

let massaSolar = 10;
let spin = 0.5;
let animacaoAtiva = true;
let arrastandoBH = false;
let offsetX = 0, offsetY = 0;
let bhX = canvas.width / 2;
let bhY = canvas.height / 2;

let estrelasFundo = [];
let particulasAcrecao = [];
let anguloDisco = 0;
let astrosAdicionados = [];

const KM_POR_MASSA_SOLAR = 2.95;
const MASSA_SOL_KG = 1.989e30;

// Escala visual para o canvas principal
function escalaVisual(massa) {
  // Limita o raio máximo para caber na tela
  const raio = Math.sqrt(massa) * 4;
  return Math.min(raio, 120); // máximo 120px
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

  for (let i = 0; i < 200; i++) criarParticula();

  // Sliders
  massaSlider.addEventListener('input', function() {
    massaSolar = parseFloat(this.value);
    atualizarCalculos();
    desenharMiniComparacao();
  });
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

  // Botões de buracos negros reais
  botoesBHs.forEach(btn => {
    btn.addEventListener('click', function() {
      const nome = this.dataset.nome;
      const massa = parseFloat(this.dataset.massa);
      const spinVal = parseFloat(this.dataset.spin);
      aplicarBuracoNegro(nome, massa, spinVal);
    });
  });

  // Botões de astros
  botoesAstros.forEach(btn => {
    btn.addEventListener('click', function() {
      const nome = this.dataset.nome;
      const raioKm = parseFloat(this.dataset.raio);
      const cor = this.dataset.cor;
      adicionarAstro(nome, raioKm, cor);
      desenharMiniComparacao();
    });
  });

  btnLimparAstros.addEventListener('click', function() {
    astrosAdicionados = [];
    desenharMiniComparacao();
  });

  // Eventos de arrasto
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseUp);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);

  atualizarCalculos();
  desenharMiniComparacao();
  requestAnimationFrame(draw);
}

// ===== APLICAR BURACO NEGRO ESPECÍFICO =====
function aplicarBuracoNegro(nome, massa, spinValor) {
  massaSolar = massa;
  spin = spinValor;
  // Atualiza sliders (limitando para não quebrar a interface)
  if (massa > 1000) {
    // Para massas grandes, usamos escala logarítmica no slider (se suportar)
    // Como nosso slider é linear 1-1000, ajustamos para o máximo se maior que 1000
    massaSlider.value = 1000;
    massaSolar = 1000; // limitamos para visualização
    alert(`Massa de ${nome} é muito grande para o slider linear. Limitando a 1000 M☉ para visualização.`);
  } else {
    massaSlider.value = massa;
  }
  if (spinValor > 0.99) spinValor = 0.99;
  spinSlider.value = spinValor;
  atualizarCalculos();
  desenharMiniComparacao();
}

// ===== PARTÍCULAS =====
function criarParticula() {
  const raioInicial = Math.random() * 350 + 100;
  const anguloInicial = Math.random() * Math.PI * 2;
  const velocidadeAngular = (Math.random() * 0.008 + 0.002) * (Math.random() > 0.5 ? 1 : -1);
  const velocidadeRadial = Math.random() * 0.08 + 0.02;
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

// ===== ADICIONAR ASTRO =====
function adicionarAstro(nome, raioKm, cor) {
  const kmPorPixel = getKmPorPixel(massaSolar);
  let raioPx = raioKm / kmPorPixel;
  let limiteEscala = false;
  if (raioPx > 60) {
    raioPx = 60;
    limiteEscala = true;
  } else if (raioPx < 1) {
    raioPx = 2;
    limiteEscala = true;
  }
  astrosAdicionados.push({ nome, raioKm, cor, raioPx, limiteEscala });
}

// ===== ATUALIZAR CÁLCULOS =====
function atualizarCalculos() {
  massaValor.textContent = massaSolar >= 1e6 ? massaSolar.toExponential(1) : massaSolar;
  spinValor.textContent = spin.toFixed(2);

  const raioKm = getRaioSchwarzschildKm(massaSolar);
  const raioM = raioKm * 1000;
  const massaKg = massaSolar * MASSA_SOL_KG;
  const volume = (4/3) * Math.PI * Math.pow(raioM, 3);
  const densidade = massaKg / volume;
  const comparacao = densidade / 1000;
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
}

// ===== DESENHO PRINCIPAL (igual ao modelo anterior) =====
function draw() {
  if (animacaoAtiva) {
    anguloDisco += 0.008;
    const raioBH = escalaVisual(massaSolar);
    for (let i = particulasAcrecao.length - 1; i >= 0; i--) {
      const p = particulasAcrecao[i];
      p.angulo += p.velAngular;
      p.raio -= p.velRadial;
      if (p.raio < raioBH * 0.8) {
        particulasAcrecao.splice(i, 1);
        criarParticula();
        continue;
      }
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

  desenharDiscoAcrecaoTraseira(raioBH, raioBH * achatamento);

  for (const p of particulasAcrecao) {
    if (p.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(p.trail[0].x, p.trail[0].y);
      for (let j = 1; j < p.trail.length; j++) ctx.lineTo(p.trail[j].x, p.trail[j].y);
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

  desenharHorizonteEventos(raioBH, achatamento);
  desenharDiscoAcrecaoFrontal(raioBH, raioBH * achatamento);
}

// (mantenha as funções desenharEstrelasComLente, desenharDiscoAcrecaoTraseira,
// desenharDiscoAcrecaoFrontal, desenharHorizonteEventos da resposta anterior,
// pois são as mesmas do 3º modelo)
// ... (copie do código anterior)

// ===== DESENHO DO MINI CANVAS (comparação) =====
function desenharMiniComparacao() {
  miniCtx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);
  miniCtx.fillStyle = '#000';
  miniCtx.fillRect(0, 0, miniCanvas.width, miniCanvas.height);

  const centroX = miniCanvas.width / 2;
  const centroY = miniCanvas.height / 2;
  const raioBH = Math.min(30, escalaVisual(massaSolar) * 0.4);

  miniCtx.beginPath();
  miniCtx.arc(centroX, centroY, raioBH, 0, Math.PI * 2);
  miniCtx.fillStyle = '#000';
  miniCtx.fill();
  miniCtx.strokeStyle = 'rgba(255,200,100,0.8)';
  miniCtx.lineWidth = 2;
  miniCtx.stroke();

  const numAstros = astrosAdicionados.length;
  if (numAstros === 0) {
    miniCtx.fillStyle = '#888';
    miniCtx.font = '12px Segoe UI';
    miniCtx.textAlign = 'center';
    miniCtx.fillText('Nenhum astro adicionado', centroX, centroY - raioBH - 15);
    return;
  }

  const raioOrbita = raioBH + 30;
  for (let i = 0; i < numAstros; i++) {
    const astro = astrosAdicionados[i];
    const angulo = (i * Math.PI * 2) / numAstros;
    const x = centroX + Math.cos(angulo) * raioOrbita;
    const y = centroY + Math.sin(angulo) * raioOrbita * 0.7;

    let raioDesenho = astro.raioPx;
    if (raioDesenho > 40) raioDesenho = 40;
    if (raioDesenho < 3) raioDesenho = 3;

    const grad = miniCtx.createRadialGradient(x - raioDesenho*0.3, y - raioDesenho*0.3, raioDesenho*0.1, x, y, raioDesenho);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, astro.cor);
    grad.addColorStop(1, '#000');
    miniCtx.beginPath();
    miniCtx.arc(x, y, raioDesenho, 0, Math.PI * 2);
    miniCtx.fillStyle = grad;
    miniCtx.fill();
    miniCtx.fillStyle = '#fff';
    miniCtx.font = '10px Segoe UI';
    miniCtx.textAlign = 'center';
    miniCtx.fillText(astro.nome, x, y + raioDesenho + 10);
  }
}

// ===== INTERAÇÕES DE ARRASTO (mantidas, sem astros no canvas principal) =====
function obterPosicaoMouse(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function onMouseDown(e) {
  const pos = obterPosicaoMouse(e);
  const raioArrasto = escalaVisual(massaSolar) * 1.5;
  const dx = pos.x - bhX;
  const dy = pos.y - bhY;
  if (Math.sqrt(dx*dx + dy*dy) < raioArrasto) {
    arrastandoBH = true;
    offsetX = dx;
    offsetY = dy;
    canvas.style.cursor = 'grabbing';
  }
}

function onMouseMove(e) {
  if (arrastandoBH) {
    const pos = obterPosicaoMouse(e);
    bhX = pos.x - offsetX;
    bhY = pos.y - offsetY;
    bhX = Math.max(30, Math.min(canvas.width - 30, bhX));
    bhY = Math.max(30, Math.min(canvas.height - 30, bhY));
  }
}

function onMouseUp() {
  arrastandoBH = false;
  canvas.style.cursor = 'grab';
}

function onTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const pos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
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
  if (arrastandoBH) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const pos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    bhX = pos.x - offsetX;
    bhY = pos.y - offsetY;
    bhX = Math.max(30, Math.min(canvas.width - 30, bhX));
    bhY = Math.max(30, Math.min(canvas.height - 30, bhY));
  }
}

function onTouchEnd() {
  arrastandoBH = false;
}

// ===== INICIAR =====
init();

// Botão de atualizar página
document.getElementById('btn-reload').addEventListener('click', function() {
  location.reload();
});

