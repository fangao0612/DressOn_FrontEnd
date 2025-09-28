集成指南（将现有后端接入到你的外部前端）

1) 引入 SDK
   - 复制 `frontend/sdk/apiClient.js` 到你的前端项目（或通过相对路径引用）。
   - 在 HTML 中：
```
<script type="module">
  import { FluxKontext } from './sdk/apiClient.js';
  FluxKontext.setBaseUrl('https://api.yourdomain.com');
  window.FluxKontext = FluxKontext; // 也可全局挂载
</script>
```

2) 基本调用
   - 运行 Flux（获取半成品）：
```
const res = await FluxKontext.runFlux(mainFile, 'your comfy prompt', {
  steps: 14,
  lora_names: ['clothes_remover_v0.safetensors'],
  lora_strengths: [0.75],
});
// res 内含半成品的 URL 或数据（按后端实现）
```

   - 发送到 NanoBanana（异步）：
```
const { task_id } = await FluxKontext.startNanoProcess(halfBlob, refFiles, 'your nano prompt');
const final = await FluxKontext.pollNanoResult(task_id, (j) => {
  console.log('progress:', j.status);
});
// final.imageBase64 可直接展示
```

3) 参考图尺寸对齐（可选）
```
const resizedRef = await FluxKontext.resizeImageWithPadding(refFile, mainWidth, mainHeight);
```

4) 切换回原开发前端
   - 将你的用户版前端入口保存为 `frontend/index.external.html`。
   - 运行切换脚本：
```
powershell -ExecutionPolicy Bypass -File scripts/switch_frontend.ps1 -Mode external
```
   - 切回开发版：
```
powershell -ExecutionPolicy Bypass -File scripts/switch_frontend.ps1 -Mode dev
```

5) 本地调试
   - 若后端本地：`FluxKontext.setBaseUrl('http://127.0.0.1:9090')`
   - 若后端线上：`FluxKontext.setBaseUrl('https://api.yourdomain.com')`


