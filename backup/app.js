// Minimal interactivity: upload previews, mock generation, FAQ accordion
(function(){
  const $ = (s,ctx=document)=>ctx.querySelector(s);
  const $$ = (s,ctx=document)=>Array.from(ctx.querySelectorAll(s));

  // NB nav interactions
  (function initNav(){
    const drop = $('.dropdown');
    if(drop){
      const head = drop.querySelector('.drop-head');
      const menu = drop.querySelector('.dropdown-menu');
      const setOpen = (open)=>{
        head.setAttribute('aria-expanded', String(open));
        if(menu) menu.hidden = !open;
      };
      head?.addEventListener('click', (e)=>{
        e.stopPropagation();
        const open = head.getAttribute('aria-expanded')==='true';
        setOpen(!open);
      });
      document.addEventListener('click', (e)=>{
        if(!drop.contains(e.target)) setOpen(false);
      });
    }
    $('.theme-toggle')?.addEventListener('click', ()=>{
      document.documentElement.classList.toggle('dark');
    });
  })();

  // Upload preview + drag&drop
  $$(".uploader").forEach(up=>{
    const input = up.querySelector('.file-input');
    const img = up.querySelector('.preview');
    input.addEventListener('change', ()=>{
      const file = input.files && input.files[0];
      if(!file) return;
      const url = URL.createObjectURL(file);
      img.src = url; img.hidden = false;
      up.querySelector('.drop-area').style.display = 'none';
    });
    ["dragenter","dragover"].forEach(evt=>up.addEventListener(evt,e=>{e.preventDefault();up.style.borderColor='rgba(228,192,122,.8)'}));
    ["dragleave","drop"].forEach(evt=>up.addEventListener(evt,e=>{e.preventDefault();up.style.borderColor='rgba(255,255,255,.22)'}));
    up.addEventListener('drop', e=>{const f = e.dataTransfer?.files?.[0]; if(!f) return; input.files=e.dataTransfer.files; input.dispatchEvent(new Event('change'));});
  });

  function mockGenerate(targetSel){
    const panel = document.querySelector(targetSel);
    if(!panel) return;
    panel.innerHTML = `<div style="display:grid;place-items:center;text-align:center;color:#a3aec2">
      <div style="width:40px;height:40px;border-radius:50%;border:3px solid rgba(255,255,255,.18);border-top-color:#E4C07A;animation:spin 1s linear infinite;margin-bottom:10px"></div>
      Generating look… blending identity and fabrics
    </div>`;
    setTimeout(()=>{
      const img = document.createElement('div');
      img.style.width='100%';img.style.height='100%';
      img.style.background='linear-gradient(135deg,#7b6a3a,#1b2332)';
      panel.innerHTML=''; panel.appendChild(img);
    }, 1200);
  }
  document.querySelector('.generate-btn')?.addEventListener('click', e=>{
    mockGenerate(e.currentTarget.getAttribute('data-target'));
  });
  document.querySelector('#refine-generate')?.addEventListener('click', e=>{
    mockGenerate(e.currentTarget.getAttribute('data-target'));
  });

  // Copy prompt
  $('#copy-prompt')?.addEventListener('click', ()=>{
    const el = $('#prompt'); el.select(); document.execCommand('copy'); el.blur();
  });

  // FAQ accordion
  $$(".acc-item").forEach(item=>{
    const head = item.querySelector('.acc-head');
    const panel = item.querySelector('.acc-panel');
    head.addEventListener('click', ()=>{
      const expanded = head.getAttribute('aria-expanded')==='true';
      head.setAttribute('aria-expanded', String(!expanded));
      panel.hidden = expanded;
    });
  });

  // spin keyframes
  const style=document.createElement('style');
  style.textContent='@keyframes spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(style);
})();



