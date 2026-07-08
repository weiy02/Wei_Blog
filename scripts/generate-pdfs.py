#!/usr/bin/env python3
"""
NovaWy Blog - PDF 生成脚本
================================
使用 Playwright (Chromium) + reportlab + PyPDF2 将 MkDocs 文章导出为带水印的 PDF。

用法:
  mkdocs build
  python scripts/generate-pdfs.py                    # 导出全部文章
  python scripts/generate-pdfs.py LeetCode/11        # 导出指定文章
  python scripts/generate-pdfs.py Classes/数据库.md   # 带 .md 后缀也行

工作流程:
  1. 启动本地 HTTP 服务器托管 site/ 目录
  2. 找到指定文章页面（或全部页面）
  3. 用 Chromium 打开每个页面（亮色模式），隐藏无关 UI 元素
  4. 导出为干净 PDF（含页眉页脚页码）
  5. 用 reportlab 生成水印覆盖层
  6. 用 PyPDF2 将水印逐页加盖到 PDF 上
  7. 输出到 pdf-output/ 目录
"""

import os
import sys
import time
import threading
import logging
import io
import shutil
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn

# === 配置 ================================================

SITE_DIR = Path(__file__).resolve().parent.parent / "site"
PDF_DIR = Path(__file__).resolve().parent.parent / "pdf-output"
TMP_DIR = PDF_DIR / ".tmp"  # 临时目录，处理完后删除
PORT = 8765
BASE_URL = f"http://localhost:{PORT}"

# 水印文字
WATERMARK_TEXT = "初屿白"

# PDF 页眉/页脚
SITE_NAME = "NovaWy"

# ==========================================================

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("pdf-gen")


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    """支持多线程的 HTTP 服务器"""
    allow_reuse_address = True


def get_page_list():
    """从 site 目录获取所有需要生成 PDF 的页面列表"""
    pages = []
    for index_file in sorted(SITE_DIR.rglob("index.html")):
        rel_path = index_file.relative_to(SITE_DIR)
        page_dir = rel_path.parent

        if page_dir == Path("."):
            continue
        if str(page_dir) == "about":
            continue

        src_path = f"{page_dir.as_posix()}.md"
        pages.append({
            "src_path": src_path,
            "url_path": f"/{page_dir.as_posix()}",
            "html_path": f"/{rel_path.as_posix()}",
            "label": page_dir.as_posix(),
        })

    log.info(f"📄 找到 {len(pages)} 篇文章")
    return pages


def serve_site(directory):
    """启动本地 HTTP 服务器"""

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(directory), **kwargs)

        def log_message(self, format, *args):
            pass

        def translate_path(self, path):
            path = path.split("?", 1)[0].split("#", 1)[0]
            path = urllib.parse.unquote(path)
            return super().translate_path(path)

    import urllib.parse

    server = ThreadingHTTPServer(("", PORT), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    log.info(f"🌐 本地服务器已启动: http://localhost:{PORT}")
    return server


def _get_print_styles():
    """返回注入页面的 CSS，用于隐藏 UI 元素、目录样式并优化打印排版"""
    return """
    <style>
      /* === 隐藏网页 UI 元素 === */
      .md-header,
      .md-footer,
      .md-sidebar,
      .md-nav,
      .md-tabs,
      .md-content__button,
      .md-top,
      .md-version,
      .md-source,
      .md-copyright,
      .md-copyright__highlight,
      .copyright,
      .footer,
      /* 隐藏内容区可能的操作按钮 */
      .md-content a[href$=".pdf"],
      .md-content [title*="PDF"],
      .md-content [class*="pdf"],
      .md-content .md-button {
        display: none !important;
      }

      /* === 内容区优化 === */
      .md-content {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .md-main__inner {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .md-content__inner {
        margin: 0 !important;
        padding: 0 !important;
      }

      /* === 排版控制 === */
      pre, code, .highlight {
        page-break-inside: avoid;
      }
      h1, h2, h3 {
        page-break-after: avoid;
      }
      table {
        page-break-inside: avoid;
      }
      img {
        max-width: 100% !important;
        height: auto;
      }
      a {
        color: #2563eb !important;
      }
    </style>
    """


def _register_chinese_font():
    """注册系统可用的中文字体，返回字体名称；找不到则返回 Helvetica"""
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    # Windows 常见中文字体路径
    font_candidates = [
        ("Microsoft YaHei", "C:/Windows/Fonts/msyh.ttc"),
        ("SimHei", "C:/Windows/Fonts/simhei.ttf"),
        ("SimSun", "C:/Windows/Fonts/simsun.ttc"),
        ("DengXian", "C:/Windows/Fonts/deng.ttf"),
        ("FangSong", "C:/Windows/Fonts/fangsong.ttf"),
    ]

    for name, path in font_candidates:
        if os.path.exists(path):
            try:
                pdfmetrics.registerFont(TTFont(name, path))
                log.info(f"   ✅ 已加载中文字体: {name}")
                return name
            except Exception:
                continue

    log.warning("   ⚠️ 未找到中文字体，水印可能显示为方框")
    return "Helvetica"


def create_watermark_overlay():
    """
    使用 reportlab 生成水印覆盖层 PDF（内存中），
    返回 bytes，可直接被 PyPDF2 读取。
    """
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4

    font_name = _register_chinese_font()

    buf = io.BytesIO()
    pw, ph = A4  # 595.27 x 841.89 pt

    c = canvas.Canvas(buf, pagesize=A4)

    # 右下角单水印
    margin_right = 50   # 距右边距 (pt)
    margin_bottom = 40  # 距底边距 (pt)
    x = pw - margin_right
    y = margin_bottom

    c.saveState()
    c.translate(x, y)
    c.setFillColorRGB(0.6, 0.6, 0.6, alpha=0.25)
    c.setFont(font_name, 14)
    c.drawRightString(0, 0, WATERMARK_TEXT)
    c.restoreState()

    c.save()
    buf.seek(0)
    return buf


def _match_headings_to_pages(pdf_path, headings):
    """
    使用 PyPDF2 解析 PDF 文本，为每个 heading 匹配所在页码。
    返回 [{tag, text, page}, ...]
    """
    from PyPDF2 import PdfReader

    reader = PdfReader(str(pdf_path))
    result = []
    for h in headings:
        h_page = None
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if h["text"] in text:
                h_page = i + 1  # 1-indexed
                break
        result.append({**h, "page": h_page})
    return result


def _create_toc_pdf(toc_entries, font_name="Helvetica"):
    """
    使用 reportlab 生成目录页 PDF（不含链接），返回 BytesIO。
    简约风格：居中标题 + 分隔线 + 条目（左标题右页码）。
    """
    from reportlab.lib.units import cm
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4

    pw, ph = A4
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    # 标题
    c.setFont(font_name, 16)
    c.drawCentredString(pw / 2, ph - 3 * cm, "目  录")

    # 细分隔线
    margin_x = 3.5 * cm
    c.setStrokeColorRGB(0.5, 0.5, 0.5)
    c.setLineWidth(0.3)
    c.line(margin_x, ph - 3.6 * cm, pw - margin_x, ph - 3.6 * cm)

    # 条目
    y = ph - 4.8 * cm
    line_h = 0.65 * cm
    valid = [e for e in toc_entries if e.get("page") is not None]

    for entry in valid:
        if y < 2 * cm:
            log.warning("   ⚠️ 目录超出一页，部分条目被截断")
            break
        tag = entry["tag"]
        text = entry["text"]
        page = entry["page"]

        indent = 2.5 * cm if tag == "h3" else 1.2 * cm
        fs = 10 if tag == "h2" else 9

        c.setFont(font_name, fs)
        # 标题
        c.drawString(indent, y, text)
        # 页码
        c.drawRightString(pw - 1 * cm, y, str(page))

        y -= line_h

    c.save()
    buf.seek(0)
    return buf


def _finalize_pdf(base_pdf_path, toc_buf, toc_entries, watermark_buf=None):
    """
    将目录页 +（带水印的）正文合并，并添加可点击链接。
    原地覆盖 base_pdf_path。
    """
    from PyPDF2 import PdfReader, PdfWriter
    from PyPDF2.generic import AnnotationBuilder

    reader = PdfReader(str(base_pdf_path))
    writer = PdfWriter()

    # 1. 添加目录页
    toc_reader = PdfReader(toc_buf)
    writer.add_page(toc_reader.pages[0])

    # 2. 添加正文页（带水印）
    watermark_page = None
    if watermark_buf is not None:
        w_reader = PdfReader(watermark_buf)
        watermark_page = w_reader.pages[0]

    for i, page in enumerate(reader.pages):
        if watermark_page is not None:
            page.merge_page(watermark_page)
        writer.add_page(page)
        if (i + 1) % 5 == 0:
            log.info(f"    合并: 第 {i + 1}/{len(reader.pages)} 页")

    # 3. 添加可点击链接（从目录页指向正文对应页面）
    valid_links = [(e, e.get("page")) for e in toc_entries
                   if e.get("page") is not None]

    # 匹配 _create_toc_pdf 中的排版位置
    from reportlab.lib.units import cm
    pw = 595.27  # A4 宽度 pt
    ph = 841.89  # A4 高度 pt
    y_start = ph - 4.8 * cm
    line_h = 0.65 * cm

    link_added = 0
    for idx, (entry, src_page) in enumerate(valid_links):
        # TOC 是第 0 页，正文页码直接作为 writer 索引
        dest_idx = src_page
        if dest_idx >= len(writer.pages):
            continue

        tag = entry["tag"]
        indent = 2.5 * cm if tag == "h3" else 1.2 * cm
        y_pos = y_start - idx * line_h

        # 链接区域：左=缩进, 右=页边距, 上下包围文字
        rect = (indent, y_pos - 2, pw - 1 * cm, y_pos + 12)

        try:
            annotation = AnnotationBuilder.link(
                rect=[float(v) for v in rect],
                target_page_index=dest_idx,
            )
            writer.add_annotation(page_number=0, annotation=annotation)
            link_added += 1
        except Exception:
            pass

    # 写回文件
    tmp_path = base_pdf_path.with_suffix(".pdf.tmp")
    with open(tmp_path, "wb") as f:
        writer.write(f)
    shutil.move(str(tmp_path), str(base_pdf_path))

    if link_added > 0:
        log.info(f"   🔗 已添加 {link_added} 个可点击目录链接")
    elif valid_links:
        log.warning(f"   ⚠️ 未能添加目录链接（共 {len(valid_links)} 个失败）")

    return link_added


def generate_one_pdf(page_info, suffix=""):
    """
    使用 Playwright 渲染单篇 PDF（不含水印），
    返回 (pdf_path, success_bool, headings_list)。
    """
    from playwright.sync_api import sync_playwright

    label = page_info["label"]
    url = f"{BASE_URL}{page_info['url_path']}"
    pdf_path = PDF_DIR / f"{label}{suffix}.pdf"

    pdf_path.parent.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            device_scale_factor=1,
            locale="zh-CN",
        )

        pdf_page = context.new_page()

        try:
            # 打开页面
            pdf_page.goto(url, wait_until="networkidle", timeout=30000)

            # 确保为亮色模式
            try:
                toggle = pdf_page.locator("[title='切换亮色模式']")
                if toggle.is_visible(timeout=1000):
                    toggle.click()
                    time.sleep(0.3)
            except Exception:
                pass

            pdf_page.wait_for_timeout(800)

            # 提取页面 h2/h3 标题（供生成目录使用）
            headings_data = pdf_page.evaluate("""
                () => {
                    const c = document.querySelector('.md-content__inner') ||
                              document.querySelector('article') ||
                              document.querySelector('.md-content');
                    if (!c) return [];
                    return Array.from(c.querySelectorAll('h2, h3')).map(h => ({
                        tag: h.tagName.toLowerCase(),
                        text: h.textContent.trim(),
                    })).filter(h => h.text);
                }
            """)

            # 注入打印样式（隐藏 UI、优化排版）
            pdf_page.evaluate(f"""
                (function() {{
                    const el = document.createElement('div');
                    el.innerHTML = `{_get_print_styles()}`;
                    document.head.appendChild(el.firstElementChild);
                }})();
            """)
            pdf_page.wait_for_timeout(300)

            # 导出 PDF（干净版，无水印）
            pdf_page.pdf(
                path=str(pdf_path),
                format="A4",
                margin={
                    "top": "25mm",
                    "bottom": "25mm",
                    "left": "18mm",
                    "right": "18mm",
                },
                display_header_footer=True,
                header_template=f"""
                    <div style="
                        font-family: 'Fira Sans', 'Microsoft YaHei', sans-serif;
                        font-size: 9pt;
                        color: #888;
                        width: 100%;
                        text-align: center;
                        padding: 0 18mm;
                        margin: 0;
                    ">
                        {SITE_NAME} | {page_info['label']}
                    </div>
                """,
                footer_template="""
                    <div style="
                        font-family: 'Fira Sans', 'Microsoft YaHei', sans-serif;
                        font-size: 9pt;
                        color: #888;
                        width: 100%;
                        text-align: center;
                        padding: 0 18mm;
                        margin: 0;
                    ">
                        第 <span class="pageNumber"></span> 页
                    </div>
                """,
                print_background=True,
                prefer_css_page_size=True,
            )

            pdf_page.close()
            browser.close()
            return pdf_path, True, headings_data

        except Exception as e:
            try:
                pdf_page.close()
            except Exception:
                pass
            browser.close()
            raise e


def generate_pdfs(pages, no_watermark=False):
    """生成所有 PDF：渲染 → 匹配页码 → 生成目录 → 合并 + 水印 + 链接"""
    # 预创建水印覆盖层（所有文章共用同一个）
    if not no_watermark:
        log.info("🎨 创建水印覆盖层...")
        watermark_buf = create_watermark_overlay()
        log.info("   ✅ 水印覆盖层就绪")
    else:
        watermark_buf = None
        log.info("⏭️  无水印模式")

    # 统一注册中文字体（供目录使用）
    toc_font = _register_chinese_font()

    total = len(pages)
    success = 0
    failed = 0

    for i, page_info in enumerate(pages, 1):
        label = page_info["label"]
        log.info(f"[{i}/{total}] 📖 {label}")

        # 无水印时文件名加后缀
        suffix = "-无水印" if no_watermark else ""
        pdf_path = PDF_DIR / f"{label}{suffix}.pdf"

        if pdf_path.exists():
            log.info(f"   ⚠️ 文件已存在，将覆盖: {pdf_path.name}")

        try:
            # Step 1: Playwright 导出干净 PDF + 提取标题
            pdf_path, ok, headings_data = generate_one_pdf(page_info, suffix=suffix)

            file_size = pdf_path.stat().st_size
            if file_size < 1000:
                log.warning(f"   ⚠️ PDF 过小 ({file_size} bytes)，跳过")
                success += 1
                continue
            log.info(f"   ✅ 页面渲染完成 ({file_size // 1024} KB)")

            # Step 2: 匹配标题到页码
            if headings_data and len(headings_data) >= 2:
                log.info(f"   📑 正在匹配 {len(headings_data)} 个章节的页码...")
                toc_entries = _match_headings_to_pages(pdf_path, headings_data)
                found = sum(1 for e in toc_entries if e.get("page") is not None)
                log.info(f"   📑 成功匹配 {found}/{len(toc_entries)} 个章节")

                # Step 3: 生成目录页
                log.info(f"   📄 生成目录页...")
                toc_buf = _create_toc_pdf(toc_entries, font_name=toc_font)

                # Step 4: 合并目录 + 正文 + 水印 + 链接
                _finalize_pdf(pdf_path, toc_buf, toc_entries,
                              watermark_buf=watermark_buf)
            else:
                log.info(f"   ℹ️ 章节少于 2 个，跳过目录生成")
                # 仅加盖水印（无需目录时的快速路径）
                if not no_watermark and watermark_buf is not None:
                    from PyPDF2 import PdfReader, PdfWriter
                    reader = PdfReader(str(pdf_path))
                    writer = PdfWriter()
                    wm_page = PdfReader(watermark_buf).pages[0]
                    for p in reader.pages:
                        p.merge_page(wm_page)
                        writer.add_page(p)
                    tmp_path = pdf_path.with_suffix(".pdf.tmp")
                    with open(tmp_path, "wb") as f:
                        writer.write(f)
                    shutil.move(str(tmp_path), str(pdf_path))

            final_size = pdf_path.stat().st_size
            log.info(f"   ✅ PDF 生成完毕 ({final_size // 1024} KB)")
            success += 1

        except Exception as e:
            log.error(f"   ❌ 生成失败: {e}")
            import traceback
            traceback.print_exc()
            failed += 1

    log.info(f"\n{'='*55}")
    log.info(f"📊 完成: {success} 成功 | {failed} 失败 | 共 {total} 篇")
    log.info(f"📁 输出目录: {PDF_DIR}")
    log.info(f"{'='*55}")

    return success, failed


# ==========================================================


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="NovaWy Blog PDF 生成器 — 将文章导出为带水印的 PDF"
    )
    parser.add_argument(
        "article",
        nargs="?",
        default=None,
        help="文章路径（相对于 docs/），如 LeetCode/11.md 或 Classes/数据库。不指定则导出全部。",
    )
    parser.add_argument(
        "--port", type=int, default=PORT, help=f"本地服务器端口 (默认 {PORT})"
    )
    parser.add_argument(
        "--no-watermark",
        action="store_true",
        help='不添加水印（默认添加右下角"初屿白"水印）',
    )
    args = parser.parse_args()

    port = args.port
    base_url = f"http://localhost:{port}"

    if not SITE_DIR.exists():
        log.error(f"❌ site 目录不存在: {SITE_DIR}")
        log.error("请先运行: mkdocs build")
        sys.exit(1)

    log.info(f"📂 站点目录: {SITE_DIR}")

    # 获取全部页面
    all_pages = get_page_list()
    if not all_pages:
        log.warning("⚠️ 没有找到文章页面")
        sys.exit(0)

    # 筛选指定文章
    if args.article:
        target = args.article.strip()
        target = target.removeprefix("./").removesuffix(".md").removesuffix("/")
        target_path = f"{target}.md"

        matched = [p for p in all_pages if p["src_path"] == target_path]
        if not matched:
            matched = [p for p in all_pages if target.lower() in p["src_path"].lower()]
        if not matched:
            log.error(f"❌ 未找到匹配的文章: {args.article}")
            log.info("可用的文章路径:")
            for p in all_pages:
                log.info(f"   {p['src_path']}")
            sys.exit(1)

        pages = matched
        log.info(f"🎯 指定文章: {pages[0]['src_path']}")
    else:
        pages = all_pages
        log.info(f"📄 将导出全部 {len(pages)} 篇文章")

    global BASE_URL
    BASE_URL = base_url

    # 启动本地服务器
    server = serve_site(SITE_DIR)
    time.sleep(0.5)

    try:
        success, failed = generate_pdfs(pages, no_watermark=args.no_watermark)
        if failed > 0:
            sys.exit(1)
    finally:
        server.shutdown()
        log.info("🌐 本地服务器已关闭")

        # 清理临时目录
        if TMP_DIR.exists():
            shutil.rmtree(TMP_DIR, ignore_errors=True)


if __name__ == "__main__":
    main()
