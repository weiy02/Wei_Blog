# 我的博客

基于 [MkDocs](https://www.mkdocs.org/) 和 [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) 构建。

主题样式参考 [OI-Wiki](https://github.com/OI-wiki/OI-wiki)。

## 本地运行

```bash
# 安装依赖
pip install mkdocs-material

# 启动本地服务器
mkdocs serve

# 构建静态页面
mkdocs build
```

## 目录结构

```
content/               # 📝 写作区域 — 所有文章和页面
  index.md             # 首页
  about.md             # 关于页面
  _static/             # 🔧 网站功能文件（CSS/JS/图标）
  images/              # 文章配图
  Algorithms/          # 算法笔记
  Classes/             # 课程笔记
  ShuaTi/              # 刷题记录
scripts/               # 🔧 开发脚本
mkdocs.yml             # 站点配置文件
```

## 导出文章为 PDF

使用 Playwright (Chromium) 将文章渲染为带水印、页眉页码的 PDF，效果与网页一致。

```bash
# 安装 PDF 生成依赖（首次使用）
pip install playwright PyPDF2
python -m playwright install chromium

# 先构建站点
mkdocs build

# 导出全部文章（每篇一个 PDF）
python scripts/generate-pdfs.py

# 导出指定文章
python scripts/generate-pdfs.py LeetCode/11
python scripts/generate-pdfs.py LeetCode/11.md
python scripts/generate-pdfs.py Classes/数据库

# 导出无水印版本（文件名追加"-无水印"后缀）
python scripts/generate-pdfs.py --no-watermark
```

**功能特点：**
- 每篇 PDF 第一页为 **自动生成的目录**，含章节标题与对应页码
- 目录条目 **可点击跳转** 到对应章节
- 每页右下角小字水印 `初屿白`（浅灰色，25% 透明度）
- 页眉显示站点名与文章名，页脚显示页码
- 添加 `--no-watermark` 参数则无任何水印，文件名格式为 `文章名-无水印.pdf`
- 如果已有同名 PDF 则会自动覆盖

PDF 输出到 `pdf-output/` 目录，按文章路径组织。


## git提交规范

采用 **Angular Commit Message Convention** 简化版，配合 emoji 标记，适合个人博客项目。

### 提交格式

```
<type>(<scope>): <subject>

<body>
```

### Type 类型

| Type       | 含义       | Emoji | 适用场景                         |
|------------|------------|-------|----------------------------------|
| `feat`     | 新功能     | ✨     | 新增页面、目录、功能脚本         |
| `fix`      | 修复       | 🐛     | 修复链接错误、渲染问题、格式异常 |
| `docs`     | 文档       | 📝     | 文章内容更新、修改 README        |
| `style`    | 样式       | 🎨     | CSS/主题调整、页面布局优化       |
| `refactor` | 重构       | ♻️     | 目录结构调整、脚本重写           |
| `perf`     | 性能优化   | ⚡     | 构建加速、图片压缩               |
| `chore`    | 杂项       | 🔧     | 配置文件变更、依赖更新、CI 调整  |

### Scope 范围（可选）

本项目常用 scope：

- `content` — 文章内容
- `site` — 站点配置（mkdocs.yml）
- `scripts` — 构建/辅助脚本
- `styles` — 主题样式
- `pdf` — PDF 导出相关
- `readme` — README 修改

### 提交示例

```
📝 docs(content): 添加二分查找算法笔记

✨ feat(site): 新增标签云页面

🎨 style(content): 优化代码块暗色主题配色

🐛 fix(scripts): 修复 PDF 生成时中文路径报错

♻️ refactor: 将 _static 资源从 content 移至项目根目录

🔧 chore: 升级 mkdocs-material 至 9.x
```

### 本项目的 Git 分支策略

- `main` — 主分支，所有内容直接提交至此（单人项目无需复杂分支）
- 如果需要试验性改动，创建 `feat/*` 分支，合并后删除

### 提交频率建议

- **每写完一篇文章** → 一次 `docs(content): 添加xxx文章`
- **每次修改站点配置** → 一次 `chore(site): ...`
- **批量调整样式** → 一次 `🎨 style: ...`
- 不必追求"完美的一条提交"，保持原子性即可——一个改动一个提交
