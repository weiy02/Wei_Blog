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
docs/
  index.md      # 首页
  about.md      # 关于页面
  images/       # 图片资源
mkdocs.yml      # 站点配置文件
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
