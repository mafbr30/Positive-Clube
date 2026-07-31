// Cada bloco roda isolado: um erro aqui não pode travar os outros
// (ex: cards com "reveal" ficando com opacity:0 pra sempre porque um
// bug em outro recurso interrompeu a execução do script antes de chegar neles).

try {
  const menuToggle = document.getElementById('menuToggle');
  const menu = document.getElementById('menu');
  if (menuToggle && menu) {
    menuToggle.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });

    menu.querySelectorAll('.menu__link').forEach((link) => {
      link.addEventListener('click', () => {
        menu.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
} catch (err) {
  console.error('[main] menu toggle falhou', err);
}

// Compensa a altura real da nav fixa nos links âncora (#sobre, #modalidades...),
// pra não sobrar um vão mostrando o fim da seção anterior nem esconder o
// topo da seção atrás da nav.
try {
  const nav = document.querySelector('.nav');
  if (nav) {
    const setScrollOffset = () => {
      document.documentElement.style.scrollPaddingTop = `${nav.offsetHeight}px`;
    };
    setScrollOffset();
    window.addEventListener('resize', setScrollOffset);
  }
} catch (err) {
  console.error('[main] ajuste de scroll-padding-top falhou', err);
}

try {
  const sobreVideo = document.getElementById('sobreVideo');
  const soundToggle = document.getElementById('soundToggle');
  const soundIconOff = document.getElementById('soundIconOff');
  const soundIconOn = document.getElementById('soundIconOn');

  if (sobreVideo && soundToggle) {
    soundToggle.addEventListener('click', () => {
      sobreVideo.muted = !sobreVideo.muted;
      soundToggle.setAttribute('aria-pressed', String(!sobreVideo.muted));
      soundIconOff.hidden = !sobreVideo.muted;
      soundIconOn.hidden = sobreVideo.muted;
    });
  }

  // Alguns navegadores mobile ignoram o autoplay do HTML se o vídeo
  // ainda não estava visível/pronto no load. Forçamos .play() de novo
  // assim que o elemento entra na tela, e de novo quando ele carrega.
  if (sobreVideo) {
    sobreVideo.muted = true;
    sobreVideo.defaultMuted = true;

    const tryPlay = () => {
      const promise = sobreVideo.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch((err) => {
          console.error('[main] sobreVideo.play() foi rejeitado', err.name, err.message);
        });
      }
    };

    sobreVideo.addEventListener('loadedmetadata', tryPlay);
    sobreVideo.addEventListener('canplay', tryPlay);
    sobreVideo.addEventListener('error', () => {
      console.error('[main] sobreVideo falhou ao carregar', sobreVideo.error);
    });

    if ('IntersectionObserver' in window) {
      const videoObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) tryPlay();
          });
        },
        { threshold: 0.25 }
      );
      videoObserver.observe(sobreVideo);
    }

    tryPlay();
  }
} catch (err) {
  console.error('[main] som do vídeo falhou', err);
}

// Horário: segunda a sexta 5h-23h, sábado 6h-15h, domingo 8h-12h.
// Sempre calculado no horário de Brasília, não no fuso do visitante.
try {
  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');

  if (statusBadge && statusText) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(new Date());

    const get = (type) => parts.find((p) => p.type === type).value;
    const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const day = weekdayMap[get('weekday')];
    const hour = Number(get('hour')) + Number(get('minute')) / 60;

    let open;
    if (day >= 1 && day <= 5) open = hour >= 5 && hour < 23;
    else if (day === 6) open = hour >= 6 && hour < 15;
    else open = hour >= 8 && hour < 12;

    if (!open) {
      statusBadge.classList.add('is-closed');
      statusText.textContent = 'Abrirá em breve';
    }
  }
} catch (err) {
  console.error('[main] status de horário falhou', err);
}

// Anima cards ao entrar na tela.
try {
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }
} catch (err) {
  console.error('[main] animação de reveal falhou', err);
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
}

// Carrinho de modalidades avulsas: seleciona quantas quiser e manda
// pro WhatsApp já com a lista escolhida na mensagem.
try {
  const modCards = document.querySelectorAll('.mod-card');
  const cartBar = document.getElementById('cartBar');
  const cartCount = document.getElementById('cartCount');
  const cartItems = document.getElementById('cartItems');
  const cartWhatsapp = document.getElementById('cartWhatsapp');
  const selectedMods = new Set();

  function updateCartBar() {
    if (!cartBar) return;
    const list = Array.from(selectedMods);
    cartCount.textContent = String(selectedMods.size);
    cartItems.textContent = list.join(' · ');
    cartBar.hidden = selectedMods.size === 0;

    if (cartWhatsapp) {
      const message = list.length
        ? `Olá! Quero contratar essas modalidades na Academia Positive Clube: ${list.join(', ')}.`
        : 'Olá! Quero falar com a Academia Positive Clube.';
      cartWhatsapp.href = `https://wa.me/558331422373?text=${encodeURIComponent(message)}`;
    }
  }

  modCards.forEach((card) => {
    const name = card.dataset.name;
    const addBtn = card.querySelector('.mod-card__add');
    const addLabel = card.querySelector('.mod-card__add-label');
    addBtn.addEventListener('click', () => {
      const isSelected = card.classList.toggle('is-selected');
      if (isSelected) {
        selectedMods.add(name);
        addLabel.textContent = 'Remover';
      } else {
        selectedMods.delete(name);
        addLabel.textContent = 'Adicionar';
      }
      updateCartBar();
    });
  });
} catch (err) {
  console.error('[main] carrinho de modalidades falhou', err);
}
