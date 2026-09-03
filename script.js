// =============================================
// BUraco Negro Interativo - script.js
// Autor: [Seu Nome]
// Descrição: Visualização de buraco negro com animação,
// lente gravitacional, acreção em espiral, arrasto e spin.
// =============================================

// ===== ELEMENTOS DOM =====
const canvas = document.getElementById('blackholeCanvas');
const ctx = canvas.getContext('2d');
const massaSlider = document.getElementById('massa-slider');
const spinSlider = document.getElementById('spin-slider');
const massaValor = document.getElementById('massa-valor');
const spinValor = document.getElementById('spin-valor');
const btnAnimar = document.getElementById('btn-animar');
const btnReset = document.getElementById('btn-reset');
const resultadoDiv = document.getElementById('resultado');

// ===== VARIÁVEIS GLOBAIS =====
let massaSolar = 10;        // massa em massas solares
let spin = 0.5;             // parâmetro de rotação (0 a 1)
let animacaoAtiva = true;
let arrastando = false;
let offsetX = 0, offsetY = 0; // para arrastar

// Posição do buraco negro (centro padrão)
let bhX = canvas.width / 2;
let bhY = canvas.height / 2;

// Arrays de objetos
let estrelasFundo = [];
let particulasAcrecao = [];
let anguloDisco = 0;

// Constantes físicas
const KM_POR_MASSA_SOLAR = 2.95;
const MASSA_SOL_KG = 1.989e30;

// ===== INICIALIZAÇÃO =====
function init() {
  // Gera estrelas de fundo fixas (posição, tamanho, brilho, cor)
  for (let i = 0; i < 300; i++) {
    estrelasFundo.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      raio: Math.random() * 1.5 + 0.5,
      brilho: Math.random() * 0.8 + 0.2,
      cor: `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`
    });
  }

  // Cria partículas de acreção (espiral)
  for (let i = 0; i < 200; i++) {
    criarParticula();
  }

  atualizarCalculos();
  requestAnimationFrame(draw);
}

// Cria uma partícula em espiral em direção ao buraco negro
function criarParticula() {
  const raioInicial = Math.random() * 350 + 100; // distância inicial do centro
  const anguloInicial = Math.random() * Math.PI * 2;
  const velocidadeAngular = (Math.random() * 0.02 + 0.005) * (Math.random() > 0.5 ? 1 : -1);
  const velocidadeRadial = Math.random() * 0.2 + 0.05; // velocidade de queda
  const cor = `hsl(${Math.random() * 60 + 20}, 100%, 60%)`;
  particulasAcrecao.push({
    raio: raioInicial,
    angulo: anguloInicial,
    velAngular: velocidadeAngular,
    velRadial: velocidadeRadial,
    raioParticula: Math.random() * 2 + 1,
    cor: cor,
    // Para excentricidade e variedade
    excentricidade: Math.random() * 0.2,
    fase: Math.random() * Math.PI * 2
  });
}

// ===== ATUALIZAÇÃO DOS CÁLCULOS =====
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

  // Fórmula simplificada do raio do horizonte para buraco de Kerr (ergosfera)
  // R = M + sqrt(M² - a²), onde a = spin * M
  const a = spin * massaSolar;
  const rHorizonte = massaSolar + Math.sqrt(massaSolar*massaSolar - a*a);

  resultadoDiv.innerHTML = `
    🔭 <strong>Propriedades do Buraco Negro</strong>
    ----------------------------------------
    Massa: ${massaSolar} M☉ (${massaKg.toExponential(3)} kg)
    Spin: ${spin.toFixed(2)}
    Raio de Schwarzschild (sem rotação): ${raioKm.toFixed(2)} km
    Raio do horizonte (com rotação): ${rHorizonte.toFixed(2)} km
    Densidade média: ${densidade.toExponential(3)} kg/m³
    Densidade comparada à água: ${comparacao.toExponential(2)} vezes
    Temperatura Hawking: ${tempHawking.toExponential(3)} K
  `;
}

// ===== DESENHO =====
function draw() {
  if (animacaoAtiva) {
    // Atualiza ângulo global do disco
    anguloDisco += 0.01;

    // Atualiza partículas em espiral
    for (let i = particulasAcrecao.length - 1; i >= 0; i--) {
      const p = particulasAcrecao[i];
      // Aumenta ângulo (rotação) e diminui raio (queda)
      p.angulo += p.velAngular;
      p.raio -= p.velRadial;

      // Se a partícula caiu dentro do horizonte, recria
      const raioBH = Math.sqrt(massaSolar) * 4; // escala visual
      if (p.raio < raioBH * 0.8) {
        particulasAcrecao.splice(i, 1);
        criarParticula(); // mantém quantidade constante
      }
    }
  }

  desenharCena();
  requestAnimationFrame(draw);
}

function desenharCena() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Fundo preto
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Desenha estrelas de fundo com lente gravitacional
  desenharEstrelasComLente();

  // Raio visual do buraco negro (baseado na massa e spin)
  const raioBH = Math.sqrt(massaSolar) * 4;
  // Achatamento devido à rotação (efeito Kerr)
  const raioHorizontal = raioBH * (1 - 0.3 * spin);
  const raioVertical = raioBH * (1 + 0.1 * spin);

  // ===== DISCO DE ACRÉÇÃO =====
  desenharDiscoAcrecao(raioHorizontal, raioVertical);

  // ===== PARTÍCULAS EM ESPIRAL =====
  for (const p of particulasAcrecao) {
    // Posição com leve achatamento vertical
    const x = bhX + Math.cos(p.angulo) * p.raio;
    const y = bhY + Math.sin(p.angulo) * p.raio * 0.4;
    ctx.beginPath();
    ctx.arc(x, y, p.raioParticula, 0, Math.PI * 2);
    ctx.fillStyle = p.cor;
    ctx.fill();
  }

  // ===== HORIZONTE DE EVENTOS =====
  ctx.save();
  ctx.translate(bhX, bhY);
  // Rotação visual do horizonte (achatado)
  ctx.scale(1, 1 - 0.2 * spin);
  ctx.beginPath();
  ctx.arc(0, 0, raioBH, 0, Math.PI * 2);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.shadowColor = 'rgba(255, 180, 0, 0.8)';
  ctx.shadowBlur = 25;
  ctx.strokeStyle = 'rgba(255, 200, 100, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Brilho central
  const grad = ctx.createRadialGradient(bhX, bhY, 0, bhX, bhY, raioBH * 2);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(bhX, bhY, raioBH * 2, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
}

// Desenha estrelas com efeito de lente gravitacional
function desenharEstrelasComLente() {
  const raioBH = Math.sqrt(massaSolar) * 4;
  const raioInfluencia = raioBH * 6;

  for (const estrela of estrelasFundo) {
    const dx = estrela.x - bhX;
    const dy = estrela.y - bhY;
    const dist = Math.sqrt(dx*dx + dy*dy);

    let x = estrela.x;
    let y = estrela.y;
    let brilho = estrela.brilho;

    // Se estiver perto do buraco negro, aplica distorção radial
    if (dist < raioInfluencia) {
      // Fator de deslocamento (simula curvatura)
      const fator = (1 - dist / raioInfluencia) * 15; // pixels de desvio
      const desvioX = (dx / dist) * fator;
      const desvioY = (dy / dist) * fator;
      x = estrela.x - desvioX;
      y = estrela.y - desvioY;
      // Aumenta brilho aparente perto do buraco (lente)
      brilho = Math.min(1, estrela.brilho + (1 - dist / raioInfluencia) * 0.5);
    }

    ctx.beginPath();
    ctx.arc(x, y, estrela.raio, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${brilho})`;
    ctx.fill();
  }
}

// Desenha o disco de acreção com rotação diferencial (Kerr)
function desenharDiscoAcrecao(raioHorizontal, raioVertical) {
  const aneis = 6;
  for (let i = 0; i < aneis; i++) {
    const raioAnel = raioHorizontal * (1.3 + i * 0.35);
    // Rotação angular depende do raio (mais rápido perto do centro) e do spin
    const velRotacao = anguloDisco * (1 + (1 - i / aneis) * 2 + spin * 0.5);
    ctx.save();
    ctx.translate(bhX, bhY);
    ctx.rotate(velRotacao);
    ctx.beginPath();
    ctx.ellipse(0, 0, raioAnel, raioAnel * 0.35, 0, 0, Math.PI * 2);
    // Gradiente de cor laranja
    const grad = ctx.createLinearGradient(-raioAnel, 0, raioAnel, 0);
    grad.addColorStop(0, 'rgba(255, 100, 0, 0.7)');
    grad.addColorStop(0.5, 'rgba(255, 200, 0, 0.4)');
    grad.addColorStop(1, 'rgba(255, 100, 0, 0.7)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 8 + i * 2;
    ctx.stroke();
    ctx.restore();
  }
}

// ===== INTERAÇÕES =====

// Slider de massa
massaSlider.addEventListener('input', function() {
  massaSolar = parseFloat(this.value);
  atualizarCalculos();
});

// Slider de spin
spinSlider.addEventListener('input', function() {
  spin = parseFloat(this.value);
  atualizarCalculos();
});

// Botão pausar/retomar
btnAnimar.addEventListener('click', function() {
  animacaoAtiva = !animacaoAtiva;
  btnAnimar.textContent = animacaoAtiva ? 'Pausar' : 'Animar';
});

// Botão resetar posição
btnReset.addEventListener('click', function() {
  bhX = canvas.width / 2;
  bhY = canvas.height / 2;
});

// Arrastar o buraco negro com o mouse
canvas.addEventListener('mousedown', function(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  // Verifica se clicou perto do buraco negro (raio de arrasto)
  const dx = mouseX - bhX;
  const dy = mouseY - bhY;
  const raioArrasto = Math.sqrt(massaSolar) * 4 + 20; // margem
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
    // Mantém dentro dos limites
    bhX = Math.max(50, Math.min(canvas.width - 50, bhX));
    bhY = Math.max(50, Math.min(canvas.height - 50, bhY));
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

// Suporte a toque (mobile)
canvas.addEventListener('touchstart', function(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const mouseX = touch.clientX - rect.left;
  const mouseY = touch.clientY - rect.top;
  const dx = mouseX - bhX;
  const dy = mouseY - bhY;
  const raioArrasto = Math.sqrt(massaSolar) * 4 + 20;
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
    bhX = Math.max(50, Math.min(canvas.width - 50, bhX));
    bhY = Math.max(50, Math.min(canvas.height - 50, bhY));
  }
}, { passive: false });

canvas.addEventListener('touchend', function() {
  arrastando = false;
});

// ===== INICIAR TUDO =====
init();
