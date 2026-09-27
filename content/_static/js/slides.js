/* ============================================================
   幻灯片演示模式 — reveal.js v6.0.1 (MIT, © Hakim El Hattab)
   给每篇文章标题旁挂一个「演示」按钮：点一下直接进系统全屏（整个屏幕，
   不是只在网页视口里铺开），并切到 ?slides=1 的幻灯片视图。
   文章里的 --- 分隔线自动成为分页符，不需要改写任何内容。
   退出按 Esc（会连带退出全屏），没有常驻的退出按钮，免得投影时碍眼。

   设计要点：
   1. reveal 的 css/js 只在【进入演示模式时】才插进来，平时阅读零额外请求
      （注意 Material 的 instant 导航换页时会把运行时插进 head 的标签当垃圾删掉，
       所以每次进入都要重新确认一遍，见 ensureAssets）；连带把 reveal 自带的
       zoom（Alt+点击放大）和 notes（s 键演讲者视图）两个插件也一起装上；
   2. deck 是【搬】不是【克隆】：代码块的 id、复制按钮的 data-clipboard-target、
      tabbed 的 for/id、MathJax 已排版好的公式都原样保留；退出时按进入前的
      顺序把节点塞回文章，所以这里不做任何破坏性修改（标题锚点用 CSS 藏）；
   3. 幻灯片用自己的一套排版（content/_static/css/slides.css 的 B 段），
      不复用文章的 .md-typeset 版式 —— 所以这里也不再给 section 挂 md-typeset；
   4. 路由只用 query 参数，pathname 不动，这样 Material 的 instant 导航最多重跑
      一趟它自己的流程，不会真的换页。不过它有两处会咬人，都已处理：
        · 它监听 body 上的点击，只要 <a> 没写 target 就接管这次点击 ——
          所以演示按钮带 target="_self"（见 mountButton），否则它会重新抓一遍
          这个 URL、把整个正文容器换掉、把 reveal 资源删干净；
        · 换页时它会重跑 container 里的脚本，本文件会被跑第二遍，而旧实例挂在
          document 上的监听器不会消失 —— 所以有实例代号 GEN，旧实例自动变哑巴
          （见 stale()），否则一个快捷键会被好几个实例抢着处理。

   作者侧可控的东西（都写成 HTML 注释，正文里看不见）：
     <!-- 分页 -->                      显式分页（写了它就不再按 --- / ## 自动分页）
     <!-- .slide: data-... -->          贴到 <section> 上（背景、过场、auto-animate…）
     <!-- .element: class="fragment" --> 贴到【上一个】元素上，和 reveal 官方语义一致
     <!-- note: 讲稿 -->                演讲者视图里的备注（按 s 打开）
   ============================================================ */

(() => {
  'use strict';

  /* ---------- 资源地址 ---------- */
  /* 拿 extra_css 里某个 _static/css/*.css 的地址反推站点根目录。
     用 link.href 而不是 getAttribute('href')：前者是浏览器解析后的绝对地址，
     这样站点部署在子路径下（site_url 带子目录）也能拼对 reveal 的地址 */
  const BASE = (() => {
    const link = document.querySelector('link[href*="_static/css/"]');
    return link ? link.href.replace(/_static\/.*$/, '') : '/';
  })();

  /* 站点根目录的路径部分（'/' 或 '/blog/' 这种），用来算当前页相对站点根的路径 */
  const ROOT_PATH = new URL(BASE, location.href).pathname;

  const assetURL = (file) => BASE + '_static/reveal/' + file;

  /* 给我们注入的标签打个标记，方便判断是不是还在 head 里 */
  const MARK = 'data-mdx-reveal';

  /* ---------- 实例代号 ---------- */
  /* 站点开了 navigation.instant：Material 每次「换页」（点击内链、前进后退）
     都会把 [data-md-component=container] 整块换成新抓的文档，并【重新执行】
     一遍里面的 <script>（bundle 里的 bs() / Ke(M("script", container))）。
     而 extra_javascript 就落在 container 里，所以这个文件会被跑第二遍、第三遍，
     旧实例挂在 document 上的监听器可不会消失 —— 不清掉的话，同一个快捷键会被
     好几个实例响应，互相抢着建 deck。
     办法很土但有效：全局记一个递增的代号，每个实例启动时认领一个，
     所有入口先对一下代号，不是最新实例就什么都不做（旧监听器自动变哑巴） */
  const GEN = (window.__mdxSlidesGen = (window.__mdxSlidesGen || 0) + 1);
  const stale = () => window.__mdxSlidesGen !== GEN;

  /* ---------- 状态 ---------- */
  let presenting = false; // 当前在演示模式
  let entering = false; // 正在进入（挡住连点、挡住异步途中的重复调用）
  let enterCancelled = false; // 进入途中被取消（Esc / 全屏被退掉），await 恢复后看到它就停手
  let pushed = false; // 当前这条历史记录是点按钮时 push 出来的
  let session = null; // 进入前的现场：文章容器 + 它当时的子节点顺序
  let attrEdits = []; // 演示期间给元素加的属性（.element 注释），退出时还原

  function isSlidesURL(url = location) {
    return new URLSearchParams(url.search).get('slides') === '1';
  }

  function urlWithSlides(on) {
    const url = new URL(location.href);
    // p 是「从第几页开始」，只在本次演示内有意义，进出都清掉，
    // 免得退出后再点演示又莫名其妙跳到上次那一页
    url.searchParams.delete('p');
    if (on) url.searchParams.set('slides', '1');
    else url.searchParams.delete('slides');
    return url.pathname + url.search + url.hash;
  }

  /* ?p=3 从第 3 页开始（分享某一页用） */
  function startPage() {
    const page = parseInt(new URLSearchParams(location.search).get('p'), 10);
    return Number.isFinite(page) && page > 1 ? page : 1;
  }

  const articleEl = () => document.querySelector('.md-content__inner');

  /* ---------- 按需加载 reveal 资源 ---------- */

  /* 请求有可能既不来 onload 也不来 onerror（服务器卡住 / 连接被挂起），
     那样调用方会永远等下去、用户永远停在遮罩上。给每个资源加个兜底超时；
     超时之后如果其实加载成功了也不会白搭 —— 后面还有一次计算样式实测 */
  const ASSET_TIMEOUT = 8000;

  function withTimeout(promise, label) {
    return Promise.race([
      promise,
      new Promise((resolve) => setTimeout(() => resolve(`${label}（超时）`), ASSET_TIMEOUT)),
    ]);
  }

  function injectLink(href) {
    const loaded = new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.setAttribute(MARK, '');
      link.onload = () => resolve(null); // 成功
      link.onerror = () => resolve(href); // 失败：把地址报出去，别静默吞掉
      document.head.appendChild(link);
    });
    return withTimeout(loaded, href);
  }

  function loadScript(src) {
    const loaded = new Promise((resolve) => {
      const el = document.createElement('script');
      el.src = src;
      el.setAttribute(MARK, '');
      el.onload = () => resolve(null);
      el.onerror = () => resolve(src);
      document.head.appendChild(el);
    });
    return withTimeout(loaded, src);
  }

  /* 随 deck 一起按需加载的脚本。都是 UMD 包，加载完自己挂到 window 上，
     注册时直接取全局变量（见 pluginsFor）：
       · reveal.js          本体
       · plugin/zoom.js     Alt + 点击 放大局部，再点一次还原
       · plugin/notes.js    s 键打开演讲者视图（讲稿 + 计时 + 下一页预览）
     代码高亮不用 reveal 的 highlight 插件：Material 在构建期就把 token
     类名打好了，slides.css 里按 dracula 配色单独给了一套 */
  const SCRIPTS = [
    { file: 'reveal.js', ready: () => !!window.Reveal },
    { file: 'plugin/zoom.js', ready: () => !!window.RevealZoom },
    { file: 'plugin/notes.js', ready: () => !!window.RevealNotes },
  ];

  /* 把 reveal 的 css/js 备齐，返回加载失败的资源地址（没失败就是空数组）。
     bust 用于重试时绕过可能有问题的缓存 */
  async function ensureAssets(bust = '') {
    // Material 的 instant 导航会拿新页面的 head 做 diff，把我们运行时插进去的
    // 标签当垃圾删掉（integrations/instant: "Remove meta tags that are not
    // present in the new document"）。所以每次都确认一遍，缺了再补。
    const results = await Promise.all([
      ...['reveal.css', 'theme/dracula.css'].map((file) => {
        const href = assetURL(file);
        return document.head.querySelector(`link[${MARK}][href="${href}"]`)
          ? Promise.resolve(null)
          : injectLink(href + bust);
      }),
      ...SCRIPTS.map(({ file, ready }) =>
        ready() ? Promise.resolve(null) : loadScript(assetURL(file) + bust)
      ),
    ]);

    const failed = results.filter(Boolean);
    if (failed.length) {
      console.error('[slides] 这些资源没加载成功：\n  ' + failed.join('\n  '));
    }
    return failed;
  }

  /* 已加载成功的插件。miss 一个（比如 plugin/ 目录没部署）就少一个能力，
     不影响演示本身 —— 所以这里是「有几个用几个」，不抛错 */
  function pluginsFor() {
    return [window.RevealZoom, window.RevealNotes].filter(Boolean);
  }

  /* 样式到底有没有生效。
     光看 link 的 onload 是不够的：文件 404 / 路径不对 / 被中途删掉时，
     主题里的 --r-* 变量取不到值，而 deck 的背景和字号正是用它们设的 ——
     结果就是背景变透明、字号失控，幻灯片像透明贴纸一样浮在文章上面。
     所以这里实打实读一次计算样式，两个关键信号都要在：
       · reveal.css 生效 → .reveal 上会有 overflow:hidden / touch-action
       · dracula.css 生效 → --r-background-color 能解析出值 */
  function styleApplied(deck) {
    const cs = getComputedStyle(deck);
    const hasReveal = cs.overflow === 'hidden' || cs.touchAction.includes('pinch-zoom');
    const hasTheme = cs.getPropertyValue('--r-background-color').trim() !== '';
    return { ok: hasReveal && hasTheme, hasReveal, hasTheme };
  }

  /* ---------- 把文章切成一页页幻灯片 ---------- */

  /* 取节点里的 HTML 注释内容。MkDocs 可能把独立成行的注释包进 <p>，两种形态都要认 */
  function commentOf(node) {
    if (node.nodeType === 8) return node.textContent;
    if (
      node.nodeType === 1 &&
      node.tagName === 'P' &&
      node.childNodes.length === 1 &&
      node.firstChild.nodeType === 8
    ) {
      return node.firstChild.textContent;
    }
    return null;
  }

  /* 这一块里有没有真东西（只有空白 / 分隔线的块不要，否则会出现空白页） */
  function hasContent(nodes) {
    return nodes.some((node) => {
      const comment = commentOf(node);
      if (comment !== null) return /\.slide:|\.element:/.test(comment);
      if (node.nodeType === 3) return node.textContent.trim() !== '';
      if (node.nodeType !== 1) return false;
      return node.textContent.trim() !== '' || !!node.querySelector('img,svg,video,iframe');
    });
  }

  /* 显式分页标记。写成 HTML 注释：正文里看不见（不会像 --- 那样留下一道横线），
     但幻灯片知道要在这里翻页 —— 这样「文章排版」和「分页」就解耦了 */
  const SLIDE_MARKER = /^\s*(slide|分页|newpage|pagebreak)\s*$/i;

  /* 贴到 <section> 上的属性：<!-- .slide: data-background-color="#000" --> */
  const SLIDE_ATTRS = /^\s*\.slide:\s*(.+?)\s*$/;

  /* 贴到【上一个】元素上的属性：<!-- .element: class="fragment" -->。
     和 reveal 官方 Markdown 插件同一套语义，fragment / r-stack / r-fit-text
     这些作者侧的写法都靠它生效 */
  const ELEMENT_ATTRS = /^\s*\.element:\s*(.+?)\s*$/;

  /* 演讲者备注：<!-- note: 一句话讲稿 -->（中英文都认）。会被做成
     <aside class="notes">，按 s 打开演讲者视图时显示 */
  const NOTES = /^\s*(?:notes?|备注|讲稿)\s*[:：]\s*([\s\S]+?)\s*$/i;

  /* 按分页规则把节点切块。rule 返回：
       'break'       这个节点只是分隔符（如 <hr>），不进入任何一页
       'break-keep'  这个节点既是分隔符也是新一页的内容（如 <h2>）
       'keep'        普通内容 */
  function splitBy(nodes, rule) {
    const chunks = [];
    let current = { nodes: [], attrs: '', notes: [] };

    nodes.forEach((node) => {
      const comment = commentOf(node);
      if (comment !== null) {
        if (SLIDE_MARKER.test(comment)) {
          // 标记本身跟着新的一页走（退出时按原始顺序放回去，不能丢）
          chunks.push(current);
          current = { nodes: [node], attrs: '', notes: [] };
          return;
        }
        const element = comment.match(ELEMENT_ATTRS);
        if (element) {
          // 属性贴到这一块里最后一个元素节点上（注释通常写在元素的下一行）
          applyElementAttrs(lastElement(current.nodes), element[1]);
          current.nodes.push(node);
          return;
        }
        const note = comment.match(NOTES);
        if (note) {
          current.notes.push(note[1]);
          current.nodes.push(node);
          return;
        }
        const attr = comment.match(SLIDE_ATTRS);
        if (attr) current.attrs = attr[1];
        current.nodes.push(node);
        return;
      }

      const action = rule(node);
      if (action === 'break') {
        chunks.push(current);
        current = { nodes: [], attrs: '', notes: [] };
        return;
      }
      if (action === 'break-keep') {
        chunks.push(current);
        current = { nodes: [node], attrs: '', notes: [] };
        return;
      }
      current.nodes.push(node);
    });

    chunks.push(current);
    return chunks.filter((chunk) => hasContent(chunk.nodes) || chunk.attrs);
  }

  const NO_SPLIT = () => 'keep';

  /* 自动分页：--- 分隔线分页（本身不进幻灯片），## 二级标题也分页
     （它既是分页线，也是这一页的标题） */
  function autoSplit(node) {
    if (node.nodeType !== 1) return 'keep';
    if (node.tagName === 'HR') return 'break';
    if (node.tagName === 'H2') return 'break-keep';
    return 'keep';
  }

  /* 分页规则（都不改动文章内容）：
       · 文章里写了 <!-- 分页 -->（或 <!-- slide -->）→ 完全按标记分页，
         作者说了算，--- 和 ## 都不再自动分页；
       · 没写标记 → 自动分页：--- 和 ## 都算分页线。
     这样默认开箱能用，想精确控制的时候又能一键接管 */
  function splitSlides(nodes) {
    const marked = nodes.some((node) => {
      const comment = commentOf(node);
      return comment !== null && SLIDE_MARKER.test(comment);
    });
    return splitBy(nodes, marked ? NO_SPLIT : autoSplit);
  }

  /* 把 "data-foo=\"bar\" class=\"x\"" 这种属性串贴到元素上。
     class 是【合并】而不是覆盖：作者写 .element 时不该把元素原有的类名冲掉，
     否则退出演示后文章里的样式就变了 */
  function applyAttrs(el, attrs, onSet) {
    attrs.replace(
      /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g,
      (_, name, dq, sq, bare) => {
        const value = dq ?? sq ?? bare ?? '';
        if (onSet) onSet(name, el.getAttribute(name));
        if (name === 'class') {
          const merged = new Set(
            (el.getAttribute('class') || '').split(/\s+/).filter(Boolean)
          );
          value.split(/\s+/).filter(Boolean).forEach((cls) => merged.add(cls));
          el.setAttribute('class', [...merged].join(' '));
        } else {
          el.setAttribute(name, value);
        }
        return '';
      }
    );
  }

  /* <!-- .slide: data-background-color="#000" --> 里的属性贴到 <section> 上 */
  function applySlideAttrs(section, attrs) {
    if (attrs) applyAttrs(section, attrs);
  }

  /* 这一块里最后一个元素节点（文字 / 注释不算） */
  function lastElement(nodes) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].nodeType === 1) return nodes[i];
    }
    return null;
  }

  /* 只包着一个注释的 <p>。MkDocs 有时会把独立成行的注释包起来 */
  function isCommentWrapper(el) {
    return el.nodeType === 1 && el.tagName === 'P' && commentOf(el) !== null;
  }

  /* 写在元素【里面】的 .element 注释：属性贴到它所在的那个元素上。
     两种写法都能用，语义一致：
       - 第一条要点 <!-- .element: class="fragment" -->   → 贴到 <li>：列表不会被打散
       <!-- .element: class="fragment" -->              → 贴到上一个元素（见 splitBy）
     行内这种形态必须单独扫一遍：它藏在 <li>/<td>/<p> 里，不是文章的子节点，
     分页那套按兄弟节点走的逻辑看不到它 */
  function applyInnerElementAttrs(root) {
    const hits = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
    while (walker.nextNode()) hits.push(walker.currentNode);

    hits.forEach((node) => {
      const attrs = node.textContent.match(ELEMENT_ATTRS);
      if (!attrs) return;
      const parent = node.parentElement;
      // 顶层（或仅被 <p> 包一层）的注释交给 splitBy 处理，避免贴错元素
      if (!parent || parent === root || isCommentWrapper(parent)) return;
      applyElementAttrs(parent, attrs[1]);
    });
  }

  /* .element 注释贴上去的属性，退出演示时要摘掉。
     记的不是「值」而是「改动前的值」，原来没有这个属性就删掉 */
  function applyElementAttrs(el, attrs) {
    if (!el || el.classList.contains('mdx-slides-btn')) return;
    applyAttrs(el, attrs, (name, before) => {
      attrEdits.push({ el, name, before });
    });
  }

  function restoreAttrEdits() {
    // 倒着还原：同一个属性被改过两次也不会还原成中间态
    for (let i = attrEdits.length - 1; i >= 0; i--) {
      const { el, name, before } = attrEdits[i];
      if (before === null) el.removeAttribute(name);
      else el.setAttribute(name, before);
    }
    attrEdits = [];
  }

  /* 文章正文的顶层节点，顺序敏感：退出时按这个顺序放回去。
     演示按钮是站点自己的 UI，不参与幻灯片 */
  function contentNodes(article) {
    return Array.from(article.childNodes).filter(
      (node) => !(node.nodeType === 1 && node.classList.contains('mdx-slides-btn'))
    );
  }

  function moveIntoDeck(article) {
    // 先处理写在元素内部的行内 .element 注释（fragment 之类），
    // 再分页 —— 分页只看文章的顶层节点，看不到藏在 <li> 里的注释
    applyInnerElementAttrs(article);

    const nodes = contentNodes(article);
    // 记下进入前文章子节点的完整顺序（含演示按钮），退出时照这个顺序整体重排。
    // 只 appendChild 搬走的节点的话，留着的按钮会被挤到最前面
    const order = Array.from(article.childNodes);
    // 顺便把内联样式也记一份，退出时还原
    const styles = snapshotInlineStyles(nodes);

    const deck = document.createElement('div');
    deck.id = 'mdx-deck';
    deck.className = 'reveal';
    // 幻灯片本身不吃 Material 的配色（版式在 slides.css 里自成一套），
    // 但文章里可能混着站点自己的组件，标成 dark 免得它们在投影上出现浅色块
    deck.setAttribute('data-md-color-scheme', 'slate');

    const slides = document.createElement('div');
    slides.className = 'slides';

    splitSlides(nodes).forEach(({ nodes: chunk, attrs, notes }) => {
      const section = document.createElement('section');
      // 只挂自己这一个类：幻灯片的版式全部来自 slides.css 的 B 段，
      // 刻意不挂 md-typeset —— 文章的阅读版式（0.82rem / 1.85 / 大标题间距）
      // 是为长文调的，塞进画布会把标题层级压平、把表格顶出画布
      section.className = 'mdx-slide';

      // 内容外面再套一层。装不下时的整页缩放作用在这一层而不是 section 上：
      // zoom 会把元素自己的 top 偏移一起缩放，直接加在 section 上会让
      // reveal 算出来的垂直居中偏掉（实测偏 34px）
      const fit = document.createElement('div');
      fit.className = 'mdx-fit';
      // 搬运而不是克隆：id、Material 运行时挂上的事件、已排版的公式全都留着
      chunk.forEach((node) => fit.appendChild(node));

      section.appendChild(fit);

      // 讲稿挂在 section 里（reveal 的 notes 插件按 aside.notes 找）。
      // 它是演示的临时产物，不进 order，退出时跟着 section 一起消失
      notes.forEach((text) => {
        const aside = document.createElement('aside');
        aside.className = 'notes';
        aside.innerHTML = text;
        section.appendChild(aside);
      });

      applySlideAttrs(section, attrs);
      slides.appendChild(section);
    });

    deck.appendChild(slides);
    return { deck, order, styles };
  }

  /* 记下被搬走的子树里所有内联 style，退出时原样还原。
     Material 的一些组件会在元素挪位置后自己重算并把结果写在 style 上
     （比如 tabbed 标签页那条会滑动的指示条），不还原的话退出后文章就变样了 */
  function snapshotInlineStyles(nodes) {
    const shots = [];
    nodes.forEach((node) => {
      if (node.nodeType !== 1) return;
      if (node.hasAttribute('style')) shots.push([node, node.getAttribute('style')]);
      node.querySelectorAll('[style]').forEach((el) => shots.push([el, el.getAttribute('style')]));
    });
    return shots;
  }

  function restoreInlineStyles(shots) {
    (shots || []).forEach(([el, css]) => el.setAttribute('style', css));
  }

  /* reveal 会给 fragment 加上 visible / current-fragment，退出时摘掉，
     免得带回文章里影响下次进入。（fragment 本身是作者用 {.fragment} 写的，保留）
     data-fragment-index 是 reveal 同步时自己补的编号，也一并摘掉，
     这样退出后文章和进入前完全一致 */
  function cleanupRevealArtifacts(nodes) {
    const drop = (el) => {
      el.classList.remove('visible', 'current-fragment');
      if (el.hasAttribute('data-fragment-index')) el.removeAttribute('data-fragment-index');
    };
    nodes.forEach((node) => {
      if (node.nodeType !== 1) return;
      drop(node);
      node.querySelectorAll('.visible,.current-fragment,[data-fragment-index]').forEach(drop);
    });
  }

  /* ---------- 遮罩与退出按钮 ---------- */
  function showLoading() {
    if (document.querySelector('.mdx-loading')) return;
    const el = document.createElement('div');
    el.className = 'mdx-loading';
    el.textContent = '正在进入演示…';
    document.body.appendChild(el);
  }

  const hideLoading = () => document.querySelector('.mdx-loading')?.remove();

  /* 进入演示 = 直接进系统全屏（占满整个屏幕，不是只在网页视口里铺开）。
     requestFullscreen 必须由用户手势发起，所以只在这里同步调用 ——
     外面再包一层 await 的话手势就过期了。点按钮 / 按快捷键都算手势；
     直接打开 ?slides=1 没有手势，浏览器会拒绝，那就退回窗口内演示 */
  function goFullscreen() {
    if (document.fullscreenElement) return null;
    // 没有用户激活就直接跳过，省掉一条控制台报错
    if (navigator.userActivation && !navigator.userActivation.isActive) return null;
    const el = document.documentElement;
    const request = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!request) return null; // iOS Safari 之类不支持对普通元素全屏，忽略即可
    // 把 promise 交出去：全屏是异步的，得等它落定再让 reveal 量尺寸，
    // 否则量到的是过渡中的旧视口，整个 deck 的缩放和居中都会错
    return Promise.resolve(request.call(el)).catch(() => {});
  }

  function exitFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) return;
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (!exit) return;
    Promise.resolve(exit.call(document)).catch(() => {});
  }

  /* 一页装不下时（技术文章很常见：一整段带好几个代码块），整页等比缩小，
     而不是让内容被固定的画布裁掉。缩得比 MIN_FIT 还狠就没有可读性了，
     那种页面建议用 <!-- 分页 --> 拆开。

     三个容易踩的点，都在下面处理掉了：
     1. reveal 会把 viewDistance 之外的 section 设成 display:none，那些页量
        出来是 0（原来就是这样：只有当前页附近能量到尺寸，所以缩放几乎从不
        生效，长页面直接被画布裁掉）。量之前先加 .mdx-measuring 把所有页
        摊开，量完立刻撤掉，用户看不到；
     2. 宽度基准要减掉 padding：fit 的 scrollWidth 是含 padding 的（撑满画布
        那 1200px），而可用宽度也是「画布宽度减去 padding」。两头都用同一个
        基准，没溢出的页才会老老实实算成 1（不缩）；
     3. 高度基准用画布高度：fit 的高度是内容撑出来的，zoom 会把它整体
        （含 padding）等比缩掉，所以直接和画布高比就行。
     缩放作用在内层 .mdx-fit 上而不是 section 上：加在 section 上会把
     它自己的 top 偏移一起缩放，reveal 算好的垂直居中就偏了（实测偏 34px） */
  const MIN_FIT = 0.35;

  function fitSlides(deck) {
    if (!window.Reveal || typeof Reveal.getConfig !== 'function') return;
    const cfg = Reveal.getConfig();
    const fits = Array.from(deck.querySelectorAll('.slides > section > .mdx-fit'));
    if (!fits.length) return;

    // 先清掉上一次的缩放再量，这样反复调用是幂等的（不会越量越小）
    fits.forEach((fit) => {
      fit.style.zoom = '';
    });

    deck.classList.add('mdx-measuring');
    const plan = fits.map((fit) => {
      const cs = getComputedStyle(fit);
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const availW = cfg.width - padX;
      const needW = fit.scrollWidth - padX;
      const needH = fit.scrollHeight;
      if (needW <= 0 || needH <= 0) return null; // 空白页，没什么好缩的
      const k = Math.min(1, availW / needW, cfg.height / needH);
      return k < 0.999 ? [fit, Math.max(k, MIN_FIT)] : null;
    });
    deck.classList.remove('mdx-measuring');

    plan.forEach((entry) => {
      if (entry) entry[0].style.zoom = entry[1].toFixed(3);
    });
  }

  /* 内容尺寸变了就重新适配一次。站点的中文网页字体（霞鹜文楷走 CDN）和图片
     都是异步到位的，字体到位前后正文高度不一样 —— reveal 量到错的高度，
     垂直居中会偏几十像素，该缩小的页也可能漏掉。字体好了以后必须再量一次 */
  function refit(deck) {
    if (!presenting || !deck.isConnected) return;
    fitSlides(deck);
    if (typeof Reveal.layout === 'function') Reveal.layout();
  }

  /* 等 reveal 真正就绪。
     Reveal.initialize() 内部是 plugins.load(…).then(start)，start() 才是
     真正给幻灯片定位 / 隐藏非当前页的地方 —— 它是异步的，而且 initialize
     返回的 promise 只在 ready 事件时才 resolve。一旦它没走完，
     所有 section 就还是普通块级元素，会一股脑堆在屏幕上。
     所以这里显式等一个 ready（带超时），超时就当作失败处理 */
  function waitForReady(timeout = 4000) {
    if (!window.Reveal) return Promise.resolve(false); // 库本身就没加载上
    if (typeof Reveal.isReady === 'function' && Reveal.isReady()) return Promise.resolve(true);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok) => {
        if (!settled) {
          settled = true;
          resolve(ok);
        }
      };
      try {
        Reveal.on('ready', () => finish(true));
      } catch (err) {
        /* 拿不到事件就只靠超时 */
      }
      setTimeout(
        () => finish(!!window.Reveal && typeof Reveal.isReady === 'function' && Reveal.isReady()),
        timeout
      );
    });
  }

  function watchContentSize(deck) {
    // 字体就绪的那一刻重排
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => refit(deck));
    }
    // 再兜几次：全屏过渡、滚动条消失、图片撑开高度都发生在这之后，
    // 每一次都很便宜（量几页尺寸 + 一次 layout），漏掉一次就是画面错乱
    [150, 500, 1000].forEach((delay) => setTimeout(() => refit(deck), delay));
  }

  /* ---------- 键盘 ---------- */

  /* 演示时把按键拦在 document 这一层，不让它继续冒泡到 window：
     Material 的全局快捷键（n / p 翻页、s 与 / 搜索）挂在 window 上，
     而 reveal 挂在 document 上 —— 在 document 上停止冒泡刚好只挡住前者。
     注意这里只能用 stopPropagation：换成 stopImmediatePropagation 会把
     注册在同一个 document 上的 reveal 一起干掉 */
  function blockMaterialKeys(event) {
    event.stopPropagation();
  }

  /* Esc 走捕获阶段，抢在 reveal 前面判断：
     reveal 自己用 Esc 关概览（overview）/ 帮助浮层，那种情况下让给它处理 */
  function onEscape(event) {
    if (event.key !== 'Escape') return;
    if (window.Reveal) {
      try {
        if (Reveal.isOverview() || Reveal.isOverlayOpen()) return;
      } catch (err) {
        /* 拿不到 reveal 内部状态就按退出处理 */
      }
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    requestExit();
  }

  /* 阅读模式下 Ctrl/⌘ + Alt + P 进入演示。
     用 event.code 而不是 event.key：macOS 上按住 Option 会把 key 变成 π */
  function onShortcut(event) {
    if (stale()) return; // 旧实例的监听器：让位给最新实例
    if (event.code !== 'KeyP' || !event.altKey) return;
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    enter();
  }

  /* ---------- 进入 / 退出 ---------- */

  /* 取消一次进行到一半的进入。调用前提：deck 还没建（presenting=false），
     文章原封未动，所以只需要收拾全屏、遮罩和那条 ?slides=1 历史记录。
     两个入口都指向这里：无全屏进入时页面收得到的 Esc（onEnteringEscape），
     和全屏状态下被浏览器截走的 Esc（onFullscreenChange，此时页面收不到 keydown） */
  function cancelEntering() {
    if (!entering) return;
    enterCancelled = true;
    entering = false;
    exitFullscreen();
    hideLoading();
    if (pushed) {
      pushed = false;
      // 此时文章还没被动过，直接退掉这条历史记录是安全的
      history.back();
    }
  }

  async function enter() {
    if (presenting || entering || stale()) return;
    const article = articleEl();
    if (!article) return;

    entering = true;
    enterCancelled = false;
    // 加载期间也必须能按 Esc 退出 —— 否则资源被卡住时用户会被晾在
    // 全屏的纯色遮罩里出不去（onEscape 要到 reveal 就绪后才挂上）。
    // 注意：全屏状态下 Chrome 会把 Esc 直接截走退全屏（页面收不到 keydown），
    // 所以真正的取消入口在 onFullscreenChange 里，这里兜的是无全屏的进入（刷新链接）
    const onEnteringEscape = (event) => {
      if (event.key !== 'Escape') return;
      if (!entering) {
        // 已经过了加载期：摘掉自己，把按键留给正式的 onEscape
        document.removeEventListener('keydown', onEnteringEscape, true);
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      // deck 已经建起来了就走正常退出（会恢复文章、清掉 ?slides=1）
      if (presenting) {
        requestExit();
        return;
      }
      cancelEntering();
    };
    document.addEventListener('keydown', onEnteringEscape, true);
    // 上一次演示万一没走完（比如中途刷新），残留的 .element 改动先清掉，
    // 免得这轮把「别人的改动」当成原始状态记下来
    restoreAttrEdits();
    showLoading();
    // 同步发起全屏：必须在用户手势还有效的时候调（下面就要 await 了）
    const fullscreen = goFullscreen();

    // 点按钮进来时把 ?slides=1 补上：这样链接能分享、刷新还留在演示里。
    // pushState 不会触发 popstate，Material 也只认 pathname 变化，所以不会打架
    if (!isSlidesURL()) {
      history.pushState({ mdxSlides: true }, '', urlWithSlides(true));
      pushed = true;
    }

    try {
      await ensureAssets();
      // 等 MathJax 排版完再搬节点，否则可能把还没渲染的 \( \) 原文搬进幻灯片。
      // 但只等 1.5 秒：MathJax 走 CDN（jsdelivr），网络被卡住时它的 startup
      // promise 永远不落定，整个 enter() 就被晾死在加载遮罩上（全屏里一片
      // 纯色）。超时就继续 —— 没排完的公式搬进 deck 后再补排一次（见下）
      if (window.MathJax?.startup?.promise) {
        await Promise.race([
          MathJax.startup.promise,
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      }
    } catch (err) {
      // 资源没加载出来就进不了演示 —— 别把用户晾在全屏里
      console.error('[slides] 进入演示模式失败：', err);
      exitFullscreen();
      hideLoading();
      if (pushed) {
        pushed = false;
        history.replaceState(null, '', urlWithSlides(false));
      }
      entering = false;
      document.removeEventListener('keydown', onEnteringEscape, true);
      return;
    }

    // 加载中被取消（Esc / 全屏被退掉）了：清理已经在 cancelEntering 里做完，
    // 后面不要再碰 DOM，也别把 deck 建出来
    if (enterCancelled) return;

    // 等全屏切换落定再建 deck：视口尺寸在过渡中会变，
    // reveal 一旦按旧尺寸算好缩放和居中，后面就一直是错的
    if (fullscreen) await fullscreen;
    if (enterCancelled) return;

    document.documentElement.classList.add('mdx-presenting');
    const moved = moveIntoDeck(article);
    session = {
      article,
      order: moved.order,
      styles: moved.styles,
      path: location.pathname,
      deck: moved.deck,
    };
    document.body.appendChild(moved.deck);
    presenting = true; // 从这里开始就能正常退出了

    // 配置写在外面，失败重试时要用同一份
    const revealConfig = {
      // 不走 reveal 自己的 #/n 路由：URL 由上面那套 query 参数方案独占
      hash: false,
      respondToHashChanges: false,
      fragmentInURL: false,
      history: false,
      controls: true,
      controlsLayout: 'bottom-right',
      progress: true,
      center: true,
      slideNumber: 'c/t',
      keyboard: true,
      transition: 'slide',
      /* autoAnimate 的 FLIP 会往元素上写内联样式，退出后这些样式会跟着
         节点回到文章里 —— 但退出时本来就会把整棵子树的内联样式还原
         （见 snapshotInlineStyles / restoreInlineStyles），所以可以打开。
         它是按 data-id 配对的：文章里没写 data-id 就什么都不发生，
         想用的时候在相邻两页写上 data-id="xxx" 即可 */
      autoAnimate: true,
      viewDistance: 2,
      mobileViewDistance: 1,
      // 别去打扰宿主页面：不向父窗口发消息，切回来也不抢焦点
      postMessage: false,
      focusBodyOnPageVisibilityChange: false,
      // 幻灯片画布尺寸；字号在 slides.css 里用 --r-main-font-size 调
      width: 1200,
      height: 750,
      margin: 0.04,
      minScale: 0.2,
      maxScale: 1.6,
      // reveal 自带的 zoom（Alt+点击放大）/ notes（s 键演讲者视图）。
      // 没注册任何语法高亮插件：token 类名是 Material 构建期打好的，
      // 配色在 slides.css 里配好了
      plugins: pluginsFor(),
    };

    /* 刻意不等 initialize() 的 promise：它只在 ready 时才 resolve，
       万一卡住就永远等不到超时。改成「发起初始化 → 等 ready 事件（带超时）」，
       无论它抛错、卡住还是只是慢，最终都有确定结果 */
    let ready = false;
    try {
      /* 样式没真正生效就别往下走 —— 否则用户看到的是一堆透明浮在文章上的
         文字（背景取不到 --r-background-color 就成了透明）。重载一次还不行
         就干净退出，并在控制台把该检查什么说清楚 */
      let style = styleApplied(moved.deck);
      if (!style.ok) {
        console.warn(
          `[slides] 样式没生效（reveal.css=${style.hasReveal} 主题=${style.hasTheme}），重新加载一遍`
        );
        document.head.querySelectorAll(`link[${MARK}]`).forEach((el) => el.remove());
        await ensureAssets('?reload=1');
        style = styleApplied(moved.deck);
      }
      if (!style.ok) {
        console.error(
          '[slides] reveal 的样式始终没生效，退出演示。请确认 content/_static/reveal/ ' +
            '下的文件都已部署（特别是 theme/dracula.css）'
        );
        requestExit();
        return;
      }

      for (let attempt = 1; attempt <= 2 && !ready; attempt++) {
        try {
          Promise.resolve(Reveal.initialize(revealConfig)).catch((err) =>
            console.error('[slides] reveal 初始化报错：', err)
          );
        } catch (err) {
          console.error('[slides] reveal 初始化失败：', err);
        }
        ready = await waitForReady(attempt === 1 ? 3000 : 2500);
        if (!ready && attempt === 1) {
          // 偶尔会卡在 plugins.load 那一环：销毁干净重来一次
          console.warn('[slides] reveal 第一次初始化没就绪，重试一次');
          if (window.Reveal && typeof Reveal.destroy === 'function') {
            try {
              Reveal.destroy();
            } catch (err) {
              /* 忽略，下面照样重新 initialize */
            }
          }
        }
      }
    } catch (err) {
      // 这一段的任何意外（比如 reveal.js 压根没加载上、Reveal 未定义）
      // 都必须走到下面的 !ready 分支去，不能把 deck 和遮罩留在页面上
      console.error('[slides] 初始化过程出错：', err);
      ready = false;
    } finally {
      entering = false;
      document.removeEventListener('keydown', onEnteringEscape, true);
    }

    if (!ready || !presenting) {
      // 初始化没走完的话，所有幻灯片还是普通块级元素、会堆成一团，
      // 这种半成品不能露给用户 —— 干净地退回文章
      console.error('[slides] reveal 初始化未完成，退出演示');
      requestExit();
      return;
    }

    // 就绪了才让 deck 可见（CSS 里默认 visibility: hidden）
    moved.deck.classList.add('mdx-deck-ready');

    // 前面等 MathJax 超时了的话，公式可能还是 \( \) 原文 ——
    // 现在节点都进了 deck，让 MathJax 对 deck 补排一次（没装它就是空操作）
    if (window.MathJax?.typesetPromise) {
      try {
        MathJax.typesetPromise([moved.deck]).catch(() => {});
      } catch (err) {
        /* MathJax 自己还没就绪就先算了，公式以原文显示 */
      }
    }

    // 有页面装不下就把它们缩到画布里，然后让 reveal 按新尺寸重新居中
    refit(moved.deck);
    // 字体 / 图片到位后再量一次（上面的居中偏差就是它们造成的）
    watchContentSize(moved.deck);

    // 分享链接 / 刷新进来的没有用户手势，浏览器拒绝了 requestFullscreen，
    // 只能先在视口里演示。补一个「首次交互就上真全屏」：手势在点击 /
    // 按键那一刻是有的，那时再请求就批了
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const grabGesture = (event) => {
        // Esc 是退出演示的，别在退出途中反而请求全屏
        if (event.type === 'keydown' && event.key === 'Escape') return;
        document.removeEventListener('pointerdown', grabGesture, true);
        document.removeEventListener('keydown', grabGesture, true);
        goFullscreen();
      };
      document.addEventListener('pointerdown', grabGesture, true);
      document.addEventListener('keydown', grabGesture, true);
      // 用户用别的方式（比如 reveal 的 F 键）自己开了全屏的话，
      // 开起来之后这两个监听就再也用不上了，顺手摘掉
      document.addEventListener(
        'fullscreenchange',
        () => {
          document.removeEventListener('pointerdown', grabGesture, true);
          document.removeEventListener('keydown', grabGesture, true);
        },
        { once: true }
      );
    }

    const page = startPage();
    if (page > 1) Reveal.slide(page - 1);

    hideLoading();

    // initialize 期间可能已经被 Esc 退出去了，那就别再挂键盘监听 ——
    // blockMaterialKeys 会把按键挡住不让冒泡到 window，留着会连累站点自己的快捷键
    if (!presenting) return;

    // 必须在 reveal 注册完 document 上的键盘监听之后再挂，才能保证它先收到事件
    document.addEventListener('keydown', blockMaterialKeys);
    document.addEventListener('keydown', onEscape, true);
  }

  /* 把搬走的节点按原顺序放回文章。已经顺着导航跳到别的页面时，
     节点早就跟着 deck 一起没了，这时什么都不做 */
  function restore() {
    const current = session;
    session = null;
    if (!current) {
      attrEdits = [];
      return;
    }

    current.deck.remove();
    // 节点已经跟着 deck 一起没了（换了页面），记录清掉就行，
    // 那些元素对象也没必要再去改
    if (!current.article.isConnected || location.pathname !== current.path) {
      // 换了页面是正常的；还在同一个页面却连不上文章容器就说明出事了 ——
      // 兜底记一笔，免得内容悄没声地丢在 deck 里
      if (location.pathname === current.path) {
        console.error(
          '[slides] 文章容器在演示期间被换掉了，正文没能还回去（deck 里的内容已丢弃）'
        );
      }
      attrEdits = [];
      return;
    }

    cleanupRevealArtifacts(current.order);
    // 按进入前的顺序整体重排（appendChild 对已有子节点是「移动」，所以顺序就是结果）
    current.order.forEach((node) => current.article.appendChild(node));
    // .element 注释贴上去的属性（fragment / r-stack …）还挂在元素上，
    // 归位后一并摘掉，文章才算回到进入前的样子
    restoreAttrEdits();
    // 还原演示期间被改过的内联样式。节点归位会触发 Material 自己的
    // ResizeObserver（tabbed 指示条会先清空再重算），所以还要再校准两次
    restoreInlineStyles(current.styles);
    requestAnimationFrame(() => restoreInlineStyles(current.styles));
    setTimeout(() => restoreInlineStyles(current.styles), 250);
    mountButton();
  }

  function teardown() {
    if (!presenting) return;
    presenting = false;

    document.removeEventListener('keydown', blockMaterialKeys);
    document.removeEventListener('keydown', onEscape, true);

    if (window.Reveal && typeof Reveal.destroy === 'function') {
      try {
        Reveal.destroy();
      } catch (err) {
        /* 销毁失败也不影响后面的收尾 */
      }
    }

    // 兜底清掉 reveal 给 html / body 加的类：留着会让整页失去滚动
    document.documentElement.classList.remove('reveal-full-page', 'mdx-presenting');
    document.body.classList.remove('reveal-viewport');

    // 退出演示就把系统全屏也收掉，回到正常的浏览状态
    exitFullscreen();
    hideLoading();
    restore();
  }

  function requestExit() {
    if (!presenting) return;
    // 顺序很关键：【先】把文章恢复原样，【再】退掉那条历史记录。
    // history.back() 会惊动 Material 的 instant 导航：它会拿着【此刻】的文章
    // 内容重新渲染一遍页面。如果这时候文章还是被掏空的状态（内容都在 deck 里），
    // 它复制出来的就是一个空文章 —— 我们的原节点再也还不上去了，整篇文章就没了。
    teardown();
    if (pushed) {
      pushed = false;
      // 这条历史记录是点按钮时加上的，退回去。
      // 只是 query 变了，pathname 没变，所以 Material 顶多是重渲染一次，
      // 而此时文章已经复原，怎么渲染都是对的
      history.back();
    } else {
      // 直接打开 ?slides=1 进来的，没有多余的历史记录，就地抹掉参数
      history.replaceState(null, '', urlWithSlides(false));
    }
  }

  /* ---------- 「演示」按钮 ---------- */
  function shouldSkip() {
    const rel = location.pathname.slice(ROOT_PATH.length);
    return rel === '' || /^about\/?$/.test(rel);
  }

  function mountButton() {
    if (shouldSkip()) return;
    const article = articleEl();
    if (!article || article.querySelector('.mdx-slides-btn')) return;
    const title = article.querySelector('h1');
    if (!title) return;

    const btn = document.createElement('a');
    // 带 md-button 类，导出 PDF 时被打印样式自动隐藏
    btn.className = 'mdx-slides-btn md-button md-button--primary';
    // 保留真实 href：中键 / 右键新标签可以直接打开演示链接
    btn.href = urlWithSlides(true);
    /* target="_self" 不是为了导航（下面 preventDefault 掉了），而是为了躲开
       Material 的 instant 导航：它监听 body 上的点击，只要 <a> 没写 target
       就会接管这次点击 —— 重新抓一遍这个 URL、把 [data-md-component=container]
       整块换掉、顺手把运行时注入的 reveal 资源从 head 里删掉。写在 <a> 上的
       preventDefault 拦不住它（它不看 defaultPrevented），加个 target 它就跳过了 */
    btn.target = '_self';
    btn.textContent = '演示';
    btn.title = '全屏幻灯片演示（Ctrl/⌘ + Alt + P）；退出按 Esc';
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      enter();
    });

    title.before(btn);
  }

  /* ---------- 路由与全屏 ---------- */

  /* 视口一变就重新量一次（进全屏、退全屏、换投影仪、改窗口大小都算）。
     reveal 自己只在「全屏元素就是 .reveal 本身」时才会在 fullscreenchange
     里重排，而我们给 documentElement 全屏，那次重排不会发生 ——
     少这一次重排，画面就会按旧尺寸缩放，看着就是乱 */
  window.addEventListener('resize', () => refit(session && session.deck));

  /* 系统全屏被退掉（按了 Esc、或用了系统的退出全屏手势）时，演示也一起收掉。
     注意：全屏里的 Esc 会被浏览器直接截走退全屏，页面收不到 keydown ——
     这里才是 Esc 退出演示的【主】入口（onEscape 只兜窗口内演示）。
     用 requestExit 而不是光 teardown：它还会把 ?slides=1 从 URL 里清掉，
     不然用户刷新一下又莫名回到演示模式。
     还有一个「进入途中全屏被退掉」的分支：deck 还没建时取消进入，
     否则会落进一个没有全屏的半成品演示里 */
  const onFullscreenChange = () => {
    const exited = !document.fullscreenElement && !document.webkitFullscreenElement;
    if (exited) {
      if (presenting) requestExit();
      else if (entering) cancelEntering();
      return;
    }
    // 刚进全屏：视口尺寸变了，补一次重排
    if (presenting) refit(session && session.deck);
  };
  // 老版本 Safari 只发 webkit 前缀的事件，两个都听着（handler 幂等）
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  /* 浏览器前进 / 后退。Material 只在 pathname 变化时才重新渲染页面，
     所以纯粹切 ?slides=1 的前进后退都由这里接管。
     注意「退出」这条路不受实例代号限制：万一旧实例还在演示、页面已经被
     Material 换过一轮，也得让它能把 deck 收掉，不然就卡死在幻灯片里 */
  window.addEventListener('popstate', () => {
    if (stale() && !presenting) return;
    if (isSlidesURL()) {
      if (!presenting) enter();
    } else if (presenting) {
      teardown();
    }
  });

  document.addEventListener('keydown', onShortcut);

  document$.subscribe(() => {
    if (stale()) return; // 旧实例不再管新页面
    // 直接打开 ?slides=1 也能进（分享链接）
    if (isSlidesURL() && !presenting) enter();
    // Material 换了页面内容，按钮要重新挂一次
    mountButton();
  });
})();
