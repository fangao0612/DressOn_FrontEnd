# Showcase Image Editor - 使用说明

## 功能概述

这个功能为 "Lightning-Fast Fashion Creations" 展示区的12张图片（4个展示栏 × 3张图片）添加了拖拽上传功能，并在每个展示栏右侧添加了保存按钮。

## 文件说明

- **showcase-config.js**: 配置文件，控制编辑模式开关
- **showcase-editor.js**: 处理图片上传、拖拽和保存的主逻辑
- **styles.css**: 添加了编辑器相关的CSS样式
- **index.html**: 更新了showcase部分的HTML结构

## 如何使用

### 1. 开启/关闭编辑模式

在 `showcase-config.js` 文件中修改：

```javascript
export const SHOWCASE_CONFIG = {
  EDIT_MODE: true,  // 设置为 true 显示编辑功能，false 隐藏
  // ...其他配置
};
```

- **EDIT_MODE: true** - 显示上传overlay和保存按钮
- **EDIT_MODE: false** - 隐藏所有编辑控件，恢复正常展示模式

### 2. 上传图片

有三种方式上传图片：

1. **点击图片区域** - 打开文件选择器
2. **拖拽图片** - 直接将图片拖到图片区域
3. **拖拽时高亮** - 拖拽时会显示蓝色边框提示

### 3. 保存图片

1. 为一个展示栏上传1-3张图片
2. 点击该展示栏右侧的 **Save** 按钮
3. 图片将自动下载到浏览器的下载文件夹
4. 文件命名格式：`{showcase-id}-img-{1-3}.{ext}`
   - 例如：`editorial-skyline-img-1.jpg`

### 4. 应用上传的图片

保存后，需要手动将图片移动到项目中：

1. 找到下载的图片
2. 移动到 `./assets/showcase/` 目录
3. 在 `styles.css` 中更新对应的背景图片：

```css
.showcase-img.img-1 {
  background-image: url('./assets/showcase/editorial-skyline-img-1.jpg');
}
```

## 4个展示栏的ID

- **editorial-skyline** - Editorial Skyline
- **garden-harmony** - Garden Harmony
- **island-breeze** - Island Breeze
- **arctic-aura** - Arctic Aura

## 配置选项

在 `showcase-config.js` 中可以调整：

```javascript
export const SHOWCASE_CONFIG = {
  EDIT_MODE: true,                    // 编辑模式开关
  MAX_FILE_SIZE: 10 * 1024 * 1024,   // 最大文件大小 (10MB)
  ALLOWED_TYPES: [                    // 允许的文件类型
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg'
  ],
  SAVE_DIRECTORY: './assets/showcase/' // 图片保存目录
};
```

## 功能特点

✅ 拖拽上传图片
✅ 点击上传图片
✅ 实时预览上传的图片
✅ 文件类型和大小验证
✅ 拖拽时的视觉反馈
✅ 上传成功/失败通知
✅ 批量保存每个展示栏的图片
✅ 可通过配置一键隐藏所有编辑功能
✅ 响应式设计，适配各种屏幕尺寸

## 注意事项

1. **编辑模式完成后记得关闭**：将 `EDIT_MODE` 设为 `false`
2. **图片大小**：建议上传适当分辨率的图片（建议宽度800-1200px）
3. **图片格式**：支持 JPEG, PNG, WebP
4. **浏览器兼容性**：现代浏览器都支持（Chrome, Firefox, Safari, Edge）

## 工作流程建议

1. 开启编辑模式 (`EDIT_MODE: true`)
2. 逐个展示栏上传并预览图片
3. 确认无误后点击Save按钮
4. 将下载的图片移动到 `assets/showcase/` 目录
5. 更新CSS中的background-image路径
6. 测试页面显示效果
7. 关闭编辑模式 (`EDIT_MODE: false`)
8. 提交代码

## 快速测试

1. 打开网页并滚动到 "Lightning-Fast Fashion Creations" 部分
2. 鼠标悬停在任何图片上，应该看到 "+ Drop or Click" overlay
3. 点击或拖拽图片进行测试
4. 查看右侧是否显示蓝色的 "Save" 按钮

---

如有问题或需要调整功能，请编辑对应的文件或联系开发者。
