// =============================================
// BUraco Negro Interativo - script.js (versão aprimorada)
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

let massaSolar = 10;
let spin = 0.5;
let animacaoAtiva = true;
let arrastando = false;
let offsetX = 0, offsetY = 0;
let bhX = canvas.width / 2;
let bhY = canvas.height / 2;

let estrelasFundo = [];
let particulasAcrecao = [];
let anguloDisco = 0;

const KM_POR_MASSA_SOLAR = 2.95;
const MASSA_SOL_KG = 1.989e30;

// NOVO: fator de escala maior
function escalaVisual(massa) {
  // Ajuste para dar destaque: cresce mais devagar, mas bem maior
  return Math.pow(massa, 0.6) * 6; // antes era sqrt(massa)*4
}

function init() {
  // Mais estrelas, com cores variadas
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

  for (let i = 0; i < 250; i++) {
    criarParticula();
  }

  atualizarCalculos();
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
    // trail
    trail: []
  });
}

function atualizarCalculos() {
  massaValor.textContent = massaSolar;
  spinValor.textContent = spin.toFixed(2);

  const raioKm = KM_POR_MASSA_SOLAR * massaSolar;
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
}

function draw() {
  if (animacaoAtiva) {
    anguloDisco += 0.012;
    for (let i = particulasAcrecao.length - 1; i >= 0; i--) {
      const p = particulasAcrecao[i];
      p.angulo += p.velAngular;
      p.raio -= p.velRadial;
      const raioBH = escalaVisual(massaSolar);
      if (p.raio < raioBH * 0.8) {
        particulasAcrecao.splice(i, 1);
        criarParticula();
        continue;
      }
      // Atualiza trail (últimas posições)
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
  const raioHorizontal = raioBH;
  const raioVertical = raioBH * achatamento;

  desenharDiscoAcrecao(raioHorizontal, raioVertical);

  // Partículas com trail
  for (const p of particulasAcrecao) {
    // Desenha trail
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

  // Horizonte de eventos com brilho
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
      const fator = (1 - dist / raioInfluencia) * 25; // maior desvio
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
    // Gradiente mais vivo
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

// ===== INTERAÇÕES (mantidas) =====
massaSlider.addEventListener('input', function() {
  massaSolar = parseFloat(this.value);
  atualizarCalculos();
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

canvas.addEventListener('mousedown', function(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const raioArrasto = escalaVisual(massaSolar) * 1.5;
  const dx = mouseX - bhX;
  const dy = mouseY - bhY;
  if (Math.sqrt(dx*dx + dy*dy) < raioArrasto) {
    arrastando = true;
    offsetX = dx;
    offsetY = dy;
    canvas.style.cursor = 'grabbing';
  }
});

canvas.addEventListener('mousemove', function(e) {
  if (arrastando) {
    const rect = canvas.getBoundingClientRect();
    bhX = e.clientX - rect.left - offsetX;
    bhY = e.clientY - rect.top - offsetY;
    bhX = Math.max(30, Math.min(canvas.width - 30, bhX));
    bhY = Math.max(30, Math.min(canvas.height - 30, bhY));
  }
});

canvas.addEventListener('mouseup', function() {
  arrastando = false;
  canvas.style.cursor = 'grab';
});

canvas.addEventListener('mouseleave', function() {
  arrastando = false;
  canvas.style.cursor = 'grab';
});

// Suporte a touch
canvas.addEventListener('touchstart', function(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const mouseX = touch.clientX - rect.left;
  const mouseY = touch.clientY - rect.top;
  const raioArrasto = escalaVisual(massaSolar) * 1.5;
  const dx = mouseX - bhX;
  const dy = mouseY - bhY;
  if (Math.sqrt(dx*dx + dy*dy) < raioArrasto) {
    arrastando = true;
    offsetX = dx;
    offsetY = dy;
  }
}, { passive: false });

canvas.addEventListener('touchmove', function(e) {
  e.preventDefault();
  if (arrastando) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    bhX = touch.clientX - rect.left - offsetX;
    bhY = touch.clientY - rect.top - offsetY;
    bhX = Math.max(30, Math.min(canvas.width - 30, bhX));
    bhY = Math.max(30, Math.min(canvas.height - 30, bhY));
  }
}, { passive: false });

canvas.addEventListener('touchend', function() {
  arrastando = false;
});

// ===== INICIAR =====
init();
