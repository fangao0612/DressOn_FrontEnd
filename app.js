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
    // allow replace: click on image to open file dialog
    img?.addEventListener('click', ()=>{ input?.click(); });
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




// Temporary feature: upload test image to output gallery
(() => {
  const canvas = document.querySelector('#canvas1[data-role="output"]');
  const fileInput = canvas?.querySelector('.canvas-file-input');
  
  if (!canvas || !fileInput) return;
  
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      
      // Add debug border to canvas
      canvas.style.border = '3px solid red';
      
      console.log('[DEBUG] [Upload Handler] Canvas dimensions:', {
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        offsetWidth: canvas.offsetWidth,
        offsetHeight: canvas.offsetHeight,
        scrollWidth: canvas.scrollWidth,
        scrollHeight: canvas.scrollHeight,
        computedStyles: {
          width: window.getComputedStyle(canvas).width,
          height: window.getComputedStyle(canvas).height,
          flex: window.getComputedStyle(canvas).flex,
          display: window.getComputedStyle(canvas).display,
          overflow: window.getComputedStyle(canvas).overflow
        }
      });
      
      // Clear placeholder and show image
      canvas.innerHTML = '';
      const img = document.createElement('img');
      img.src = dataUrl;
      
      // Add debug border to image
      img.style.border = '3px solid blue';
      
      // Log image dimensions after load
      img.onload = () => {
        console.log('[DEBUG] [Upload Handler] Image loaded:', {
          file: file.name,
          fileSize: file.size,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          aspectRatio: (img.naturalWidth / img.naturalHeight).toFixed(3),
          clientWidth: img.clientWidth,
          clientHeight: img.clientHeight,
          renderedAspectRatio: (img.clientWidth / img.clientHeight).toFixed(3),
          offsetWidth: img.offsetWidth,
          offsetHeight: img.offsetHeight,
          computedStyles: {
            width: window.getComputedStyle(img).width,
            height: window.getComputedStyle(img).height,
            maxWidth: window.getComputedStyle(img).maxWidth,
            maxHeight: window.getComputedStyle(img).maxHeight,
            objectFit: window.getComputedStyle(img).objectFit,
            objectPosition: window.getComputedStyle(img).objectPosition
          }
        });
        
        // Check if image appears cropped
        const aspectDiff = Math.abs((img.naturalWidth / img.naturalHeight) - (img.clientWidth / img.clientHeight));
        if (aspectDiff > 0.01) {
          console.warn('[DEBUG] [Upload Handler] ⚠️ Aspect ratio mismatch! Original:',
            (img.naturalWidth / img.naturalHeight).toFixed(3),
            'Rendered:',
            (img.clientWidth / img.clientHeight).toFixed(3));
        }
      };
      
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      img.style.objectPosition = 'center';
      img.style.display = 'block';
      canvas.appendChild(img);
      
      console.log('[DEBUG] [Upload Handler] Image element added to canvas');
      
      // Add download button
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dl-btn';
      btn.title = 'Download test image';
      const icon = document.createElement('img');
      icon.src = './assets/download.svg';
      icon.alt = 'download';
      btn.appendChild(icon);
      btn.onclick = () => {
        const a = document.createElement('a');
        a.href = dataUrl;
        const ts = new Date().toISOString().replace(/[:.]/g,'-');
        a.download = `test-${ts}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      };
      canvas.appendChild(btn);
      
      // Re-add file input for next upload
      const newInput = document.createElement('input');
      newInput.className = 'canvas-file-input';
      newInput.type = 'file';
      newInput.accept = 'image/*';
      newInput.setAttribute('aria-label', 'Upload test image');
      newInput.style.position = 'absolute';
      newInput.style.inset = '0';
      newInput.style.opacity = '0';
      newInput.style.cursor = 'pointer';
      newInput.style.zIndex = '2';
      newInput.addEventListener('change', fileInput.onchange);
      canvas.appendChild(newInput);
    };
    reader.readAsDataURL(file);
  });
})();
