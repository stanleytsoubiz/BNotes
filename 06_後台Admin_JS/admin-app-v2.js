// ── Config ────────────────────────────────────────────────────────────────────
const SITE_URL     = 'https://bnotescoffee.com';
const API_ARTICLES = '/admin/articles-data';
const API_SCHED    = '/admin/scheduled-data';
const API_AI       = '/admin/ai-pending-data';
const API_DELETE   = '/api/delete-article';
const API_APPROVE  = '/api/approve-ai-article';

const CAT_LABELS = {
  'pour-over':'手沖技法','espresso':'義式咖啡','equipment':'器材評測',
  'terroir':'產地風土','science':'沖泡科學','lifestyle':'咖啡生活',
};

// ── State ─────────────────────────────────────────────────────────────────────
let articles    = [], scheduled = [], aiPending = [];
let currentSlug = null, approveSlug = null;
let filterCat   = 'all', searchQuery = '', schedSearch = '', aiSearch = '';
let qualityCache = {};  // slug → scheduled quality scan result
let pubQualityCache = {};  // slug → published quality scan result

// ── DOM refs ──────────────────────────────────────────────────────────────────
const articlesList = document.getElementById('articles-list');
const schedList    = document.getElementById('sched-list');
const aiList       = document.getElementById('ai-list');
const filterBar    = document.getElementById('filter-bar');
const loadingOv    = document.getElementById('loading-overlay');
const loadingMsg   = document.getElementById('loading-msg');
const toast        = document.getElementById('toast');

// ── Boot ──────────────────────────────────────────────────────────────────────
loadPublished(); loadScheduled(); loadAIPending();

document.getElementById('btn-logout').addEventListener('click', () => { window.location.href='/admin/logout'; });
document.getElementById('btn-refresh').addEventListener('click', loadPublished);
document.getElementById('btn-refresh-sched').addEventListener('click', loadScheduled);
document.getElementById('btn-refresh-ai').addEventListener('click', loadAIPending);

// ── TABS ──────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn,.tab-panel').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab)?.classList.add('active');
  });
});

// ── Load Published ────────────────────────────────────────────────────────────
async function loadPublished() {
  articlesList.innerHTML = '<div class="empty-state">🔄 載入文章中…</div>';
  try {
    const res  = await fetch(API_ARTICLES);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    articles = data.articles.map(a => ({...a, cat: a.category||'lifestyle'}));
    document.getElementById('stat-published').textContent = articles.length;
    document.getElementById('badge-pub').textContent      = articles.length;
    renderPublished();
  } catch(e) {
    articlesList.innerHTML = '<div class="empty-state">❌ ' + escHtml(e.message) + '</div>';
  }
}

// ── Load Scheduled ────────────────────────────────────────────────────────────
async function loadScheduled() {
  schedList.innerHTML = '<div class="empty-state">🔄 載入中…</div>';
  try {
    const res  = await fetch(API_SCHED + '?t=' + Date.now(), {cache:'no-store'});
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    scheduled = data.articles;
    const overdue = scheduled.filter(a=>a.overdue).length;
    document.getElementById('stat-scheduled').textContent = scheduled.length;
    document.getElementById('stat-overdue').textContent   = overdue;
    const sb = document.getElementById('badge-sched');
    sb.textContent = scheduled.length + (overdue>0 ? ' ⚠️':'');
    if (overdue>0) sb.classList.add('danger-badge');
    updateNextDays();
    renderScheduled();
    autoScanScheduled(); // 背景自動掃描品質燈號
  } catch(e) {
    schedList.innerHTML = '<div class="empty-state">❌ ' + escHtml(e.message) + '</div>';
  }
}

// ── Load AI Pending ───────────────────────────────────────────────────────────
async function loadAIPending() {
  aiList.innerHTML = '<div class="empty-state">🔄 載入 AI 待審文章…</div>';
  try {
    const res  = await fetch(API_AI + '?t=' + Date.now(), {cache:'no-store'});
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    aiPending = data.articles;
    document.getElementById('stat-ai-pending').textContent = aiPending.length;
    const ab = document.getElementById('badge-ai');
    ab.textContent = aiPending.length > 0 ? aiPending.length + ' 篇' : '無';
    ab.className   = 'tab-badge ' + (aiPending.length>0 ? 'ai-badge':'');
    renderAIPending();
  } catch(e) {
    aiList.innerHTML = '<div class="empty-state">❌ ' + escHtml(e.message) + '</div>';
  }
}

function updateNextDays() {
  const upcoming = scheduled.filter(a=>!a.overdue && a.daysUntil!==null);
  document.getElementById('stat-next-days').textContent =
    upcoming.length>0 ? Math.min(...upcoming.map(a=>a.daysUntil))+' 天' : '—';
  // 逾期數字色彩
  const overdueCnt = scheduled.filter(a=>a.overdue).length;
  const overdueEl = document.getElementById('stat-overdue');
  if (overdueEl) {
    overdueEl.textContent = overdueCnt;
    overdueEl.style.color = overdueCnt > 0 ? '#d93025' : '#188038';
  }
}

// ── Render Published ──────────────────────────────────────────────────────────
function renderPublished() {
  let f = articles;
  if (filterCat!=='all') f = f.filter(a=>a.cat===filterCat);
  if (searchQuery) { const q=searchQuery.toLowerCase(); f=f.filter(a=>a.title.toLowerCase().includes(q)||a.slug.toLowerCase().includes(q)); }
  if (!f.length) { articlesList.innerHTML='<div class="empty-state">沒有符合條件的文章</div>'; return; }
  articlesList.innerHTML = f.map(a=>{
    const ql = pubQualityCache[a.slug];
    var qBtn;
    if (ql) {
      qBtn = '<button class="quality-light-badge ' + ql.light + '" title="品質報告 ' + ql.score + '/100"'
           + ' onclick="openQualityPanelPub(\'' + a.slug + '\',\'' + escHtml(a.title).replace(/'/g,'&#39;') + '\')">'
           + ql.lightLabel + '</button>';
    } else {
      qBtn = '<button class="quality-light-badge scanning"'
           + ' onclick="scanPubArticle(\'' + a.slug + '\',\'' + escHtml(a.title).replace(/'/g,'&#39;') + '\')"'
           + ' title="點擊掃描品質">🔍</button>';
    }
    const imgSrc = a.cover_image || (SITE_URL + '/images/ai/' + a.slug + '-hero.jpg');
    const thumbHtml = '<div class="col-thumb"><img class="article-thumb" src="' + imgSrc + '" alt="" loading="lazy" onerror="imgError(this)"></div>';
    return '<div class="article-row">'         + thumbHtml         + '<div>'
         + '<a class="article-title-link" href="' + SITE_URL + '/articles/' + a.slug + '.html" target="_blank">' + escHtml(a.title) + '</a>'
         + '<div class="article-slug">' + a.slug + '.html &#x2197;</div>'
         + '</div>'
         + '<div class="article-date col-date">' + (a.date||'&mdash;') + '</div>'
         + '<div class="col-cat"><span class="cat-badge">' + (CAT_LABELS[a.cat]||a.cat) + '</span></div>'
         + '<div class="action-btns">'
         + qBtn
         + '<a class="btn-preview" href="' + SITE_URL + '/articles/' + a.slug + '.html" target="_blank">&#x1F441; &#x9810;&#x89BD;</a>'
         + '<button class="btn-edit" data-slug="' + a.slug + '" data-title="' + escHtml(a.title).replace(/"/g,'&quot;') + '" data-type="published">&#x270F; &#x7DE8;&#x8F2F;</button>'
         + '<button class="btn-copy-pub" data-slug="' + a.slug + '" data-title="' + escHtml(a.title).replace(/"/g,'&quot;') + '" title="複製為排程草稿">📋 複製</button>'
         + '<button class="btn-delete" data-slug="' + a.slug + '" data-title="' + escHtml(a.title).replace(/"/g,'&quot;') + '">&#x1F5D1; &#x4E0B;&#x67B6;</button>'
         + '</div>'
         + '</div>';
  }).join('');
  articlesList.querySelectorAll('.btn-delete').forEach(b=>
    b.addEventListener('click',()=>openDeleteModal(b.dataset.slug,b.dataset.title)));
  articlesList.querySelectorAll('.btn-edit').forEach(b=>
    b.addEventListener('click',()=>openEditorModal(b.dataset.slug,b.dataset.title,b.dataset.type)));
  articlesList.querySelectorAll('.btn-copy-pub').forEach(b=>
    b.addEventListener('click',()=>openCopyModal(b.dataset.slug,b.dataset.title)));
  autoScanPublished();
}

// ── Render Scheduled ──────────────────────────────────────────────────────────
function renderScheduled() {
  let f = [...scheduled];
  if (schedSearch) { const q=schedSearch.toLowerCase(); f=f.filter(a=>a.title.toLowerCase().includes(q)||a.slug.toLowerCase().includes(q)); }
  // 預設排序：逾期優先 → 最早日期
  f.sort((a,b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return (a.date||'') < (b.date||'') ? -1 : 1;
  });
  if (!f.length) { schedList.innerHTML='<div class="empty-state">\u76ee\u524d\u6c92\u6709\u6392\u7a0b\u6587\u7ae0</div>'; return; }
  schedList.innerHTML = f.map(function(a){
    let badge='\u2014';
    if(a.daysUntil!==null){
      if(a.overdue) badge='<span class="days-badge overdue">\u903e\u671f ' + Math.abs(a.daysUntil) + ' \u5929</span>';
      else if(a.daysUntil<=7) badge='<span class="days-badge soon">\u23f0 ' + a.daysUntil + ' \u5929</span>';
      else badge='<span class="days-badge future">' + a.daysUntil + ' \u5929\u5f8c</span>';
    }
    var previewUrl = SITE_URL + '/_scheduled/' + a.slug + '.html';
    var ql = qualityCache[a.slug];
    var qBadge;
    if (ql) {
      qBadge = '<button class="quality-light-badge ' + ql.light + '" data-slug="' + a.slug + '" data-title="' + escHtml(a.title) + '" title="\u6aa2\u8996\u54c1\u8cea\u5831\u544a">' + ql.lightLabel + '</button>' +
               '<div class="quality-score-mini">' + ql.score + '/100</div>';
    } else {
      qBadge = '<button class="quality-light-badge scanning" data-slug="' + a.slug + '" data-title="' + escHtml(a.title) + '" title="\u9ede\u6b64\u6383\u63cf\u54c1\u8cea">\ud83d\udd0d \u6383\u63cf</button>';
    }
        const sImg = a.cover_image || (SITE_URL + '/images/ai/' + a.slug + '-hero.jpg');
    const sThumb = '<div class="col-thumb"><img class="article-thumb" src="' + sImg + '" alt="" loading="lazy" onerror="imgError(this)"></div>';
    return '<div class="sched-row">'      + sThumb      + '<div><div style="font-size:.9rem;font-weight:600">' + escHtml(a.title) + '</div>'           + '<div class="article-slug">' + a.slug + '.html</div></div>'      + '<div class="article-date col-date" style="' + (a.overdue ? 'color:#d93025;font-weight:700' : (a.daysUntil<=7&&a.daysUntil>=0 ? 'color:#c47e2b;font-weight:600' : '')) + '">' + (a.date||'\u2014') + '</div>'      + '<div class="col-cat"><span class="cat-badge">' + (CAT_LABELS[a.category]||a.category) + '</span></div>'      + '<div class="sched-col-quality"><div class="quality-light-col">' + qBadge + '</div></div>'      + '<div class="action-btns">'        + badge        + ' <a class="btn-preview" href="' + previewUrl + '" target="_blank">\ud83d\udc41 \u9810\u89bd</a>'        + ' <button class="btn-reschedule" data-slug="' + a.slug + '" data-date="' + (a.date||'') + '" data-title="' + escHtml(a.title) + '">\ud83d\udcc5 \u91cd\u6392</button>'        + ' <button class="btn-publish-now ' + (a.overdue?'overdue-publish':'') + '" data-slug="' + a.slug + '" data-title="' + escHtml(a.title) + '">\u26a1 \u767c\u5e03</button>'        + ' <button class="btn-edit" data-slug="' + a.slug + '" data-title="' + escHtml(a.title) + '" data-type="scheduled">\u270f\ufe0f \u7de8\u8f2f</button>'      + '</div>'    + '</div>';}).join('');
  schedList.querySelectorAll('.btn-reschedule').forEach(function(b){
    b.addEventListener('click',function(){openRescheduleModal(b.dataset.slug,b.dataset.title,b.dataset.date);});
  });
  schedList.querySelectorAll('.btn-publish-now').forEach(function(b){
    b.addEventListener('click',function(){openPublishNowModal(b.dataset.slug,b.dataset.title);});
  });
  schedList.querySelectorAll('.quality-light-badge').forEach(function(b){
    b.addEventListener('click',function(){ openQualityPanel(b.dataset.slug, b.dataset.title); });
  });
  schedList.querySelectorAll('.btn-edit').forEach(function(b){
    b.addEventListener('click',function(){ openEditorModal(b.dataset.slug, b.dataset.title, b.dataset.type); });
  });
}

// ── Render AI Pending ─────────────────────────────────────────────────────────
function renderAIPending() {
  let f = aiPending;
  if (aiSearch) { const q=aiSearch.toLowerCase(); f=f.filter(a=>a.title.toLowerCase().includes(q)||a.slug.toLowerCase().includes(q)); }
  if (!f.length) {
    aiList.innerHTML='<div class="empty-state"><div style="font-size:2rem;margin-bottom:.75rem">\ud83e\udd16</div><div style="font-weight:600;margin-bottom:.4rem">\u76ee\u524d\u6c92\u6709 AI \u5f85\u5be9\u6587\u7ae0</div><div style="font-size:.82rem">Skywork AI \u6bcf\u65e5 09:00 \u81ea\u52d5\u641c\u5c0b\u4e3b\u984c\u4e26\u751f\u6210\u6587\u7ae0</div></div>';
    return;
  }
  aiList.innerHTML = f.map(function(a){
    var qs = a.quality_score||0;
    var qColor = qs>=80?'#188038':qs>=60?'#c47e2b':'#d93025';
    var submittedTime = a.ai_submitted_at ? new Date(a.ai_submitted_at).toLocaleString('zh-TW',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '\u2014';
    var previewSlug = SITE_URL + '/_pending-ai-review/' + a.slug + '.html';
    return '<div class="ai-row">' +
      '<div>' +
        '<div style="font-size:.9rem;font-weight:600;line-height:1.4;margin-bottom:.25rem">' + escHtml(a.title) + '</div>' +
        '<div class="article-slug">' + a.slug + '.html</div>' +
        '<div style="margin-top:.3rem;display:flex;gap:.4rem;align-items:center;flex-wrap:wrap">' +
          '<span class="ai-source-tag" title="' + escHtml(a.topics_source||'') + '">' + escHtml(a.ai_model||'skywork') + '</span>' +
          '<span style="font-size:.7rem;color:var(--muted)">\u63d0\u4ea4 ' + submittedTime + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="article-date col-date" style="' + (a.overdue ? 'color:#d93025;font-weight:700' : (a.daysUntil<=7&&a.daysUntil>=0 ? 'color:#c47e2b;font-weight:600' : '')) + '">' + (a.date||'\u2014') + '</div>' +
      '<div class="col-cat"><span class="cat-badge">' + (CAT_LABELS[a.category]||a.category) + '</span></div>' +
      '<div class="quality-bar">' +
        '<span class="quality-num" style="color:' + qColor + '">' + qs + '</span>' +
        '<div class="quality-track"><div class="quality-fill" style="width:' + qs + '%;background:' + qColor + '"></div></div>' +
      '</div>' +
      '<div class="action-btns">' +
        '<a class="btn-preview" href="' + previewSlug + '" target="_blank" title="\u5617\u8a66\u5728\u524d\u53f0\u9810\u89bd">\ud83d\udc41 \u9810\u89bd</a>' +
        '<button class="btn-approve" data-slug="' + a.slug + '" data-title="' + escHtml(a.title) + '" data-date="' + (a.date||'') + '">\u2705 \u5be9\u6838\u901a\u904e</button>' +
      '</div>' +
    '</div>';
  }).join('');
  aiList.querySelectorAll('.btn-approve').forEach(function(b){
    b.addEventListener('click',function(){openApproveModal(b.dataset.slug,b.dataset.title,b.dataset.date);});
  });
}

// ── Filter / Search ───────────────────────────────────────────────────────────
filterBar.addEventListener('click',e=>{
  if(!e.target.matches('.filter-btn')) return;
  filterBar.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  e.target.classList.add('active'); filterCat=e.target.dataset.cat; renderPublished();
});
document.getElementById('search-input').addEventListener('input',e=>{searchQuery=e.target.value;renderPublished();});
document.getElementById('sched-search').addEventListener('input',e=>{schedSearch=e.target.value;renderScheduled();});
document.getElementById('ai-search').addEventListener('input',e=>{aiSearch=e.target.value;renderAIPending();});

// ── Delete Modal ──────────────────────────────────────────────────────────────
function openDeleteModal(slug,title) {
  currentSlug=slug;
  document.getElementById('modal-delete-msg').innerHTML=
    '確認要下架：<strong>《' + escHtml(title) + '》</strong><br><small>文章將移至排程佇列，Cloudflare 30–60 秒重新部署。</small>';
  document.getElementById('modal-delete').classList.add('open');
}
document.getElementById('btn-del-cancel').addEventListener('click',()=>{document.getElementById('modal-delete').classList.remove('open');currentSlug=null;});
document.getElementById('btn-del-confirm').addEventListener('click', deleteArticle);

async function deleteArticle() {
  if(!currentSlug) return;
  const slug=currentSlug; document.getElementById('modal-delete').classList.remove('open');
  showLoading('正在下架 《' + slug + '》…');
  try {
    const res  = await fetch(API_DELETE,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug})});
    const data = await res.json(); hideLoading();
    if(data.ok){showToast('✅ 下架成功 Commit: ' + data.commit,'success',5000);articles=articles.filter(a=>a.slug!==slug);document.getElementById('stat-published').textContent=articles.length;document.getElementById('badge-pub').textContent=articles.length;renderPublished();}
    else showToast('❌ ' + data.error,'error',8000);
  } catch(e){hideLoading();showToast('❌ 網路錯誤：' + e.message,'error',8000);}
  currentSlug=null;
}

// ── Approve Modal ─────────────────────────────────────────────────────────────
function openApproveModal(slug,title,date) {
  approveSlug=slug;
  document.getElementById('modal-approve-msg').innerHTML=
    '審核通過 AI 文章：<strong>《' + escHtml(title) + '》</strong><br><small>將移入排程佇列，等待預定發布日自動上線。</small>';
  document.getElementById('approve-date-input').value = date||'';
  document.getElementById('modal-approve').classList.add('open');
}
document.getElementById('btn-approve-cancel').addEventListener('click',()=>{document.getElementById('modal-approve').classList.remove('open');approveSlug=null;});
document.getElementById('btn-approve-confirm').addEventListener('click', approveArticle);

async function approveArticle() {
  if(!approveSlug) return;
  const slug=approveSlug;
  const publish_date=document.getElementById('approve-date-input').value.trim();
  document.getElementById('modal-approve').classList.remove('open');
  showLoading('🤖 審核文章《' + slug + '》，移入排程中…');
  try {
    const res  = await fetch(API_APPROVE,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug,publish_date:publish_date||undefined})});
    const data = await res.json(); hideLoading();
    if(data.ok){
      showToast('✅ 審核通過！Commit: ' + data.commit + '\n文章已排程，等待自動發布。','info',6000);
      aiPending=aiPending.filter(a=>a.slug!==slug);
      document.getElementById('stat-ai-pending').textContent=aiPending.length;
      document.getElementById('badge-ai').textContent=aiPending.length>0?aiPending.length+' 篇':'無';
      renderAIPending();
      // 重新載入排程列表
      setTimeout(loadScheduled,2000);
    } else showToast('❌ 審核失敗：' + data.error,'error',8000);
  } catch(e){hideLoading();showToast('❌ 網路錯誤：' + e.message,'error',8000);}
  approveSlug=null;
}


// ── Quality Panel & Scan ──────────────────────────────────────────────────────
const qualityPanel   = document.getElementById('quality-panel');
const qpBody         = document.getElementById('qp-body');
const qpTitle        = document.getElementById('qp-title');
const qpSlugEl       = document.getElementById('qp-slug');
document.getElementById('qp-close').addEventListener('click', () => qualityPanel.classList.remove('open'));

async function openQualityPanel(slug, title) {
  qpTitle.textContent = title || slug;
  qpSlugEl.textContent = slug + '.html';
  qpBody.innerHTML = '<div class="qp-loading">🔍 正在掃描文章品質…</div>';
  qualityPanel.classList.add('open');

  try {
    const cached = qualityCache[slug];
    const data = cached || await fetchQuality(slug);
    if (!qualityCache[slug]) qualityCache[slug] = data;
    renderQualityPanel(data);
    renderScheduled(); // 更新燈號顯示
  } catch(e) {
    qpBody.innerHTML = '<div class="qp-loading">❌ 掃描失敗：' + escHtml(e.message) + '</div>';
  }
}

async function fetchQuality(slug) {
  const res = await fetch('/api/quality-scan?slug=' + encodeURIComponent(slug) + '&t=' + Date.now(), {cache:'no-store'});
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || '掃描失敗');
  return data;
}

function renderQualityPanel(d) {
  const dimDefs = [
    { key:'seo',       label:'SEO 完整性',      max:25, color:'#1a73e8' },
    { key:'content',   label:'內文質量',         max:30, color:'#188038' },
    { key:'image',     label:'圖片規範',         max:20, color:'#9c27b0' },
    { key:'structure', label:'結構可讀性',       max:15, color:'#e65100' },
    { key:'ai',        label:'AI 收錄適性',      max:10, color:'#0288d1' },
  ];

  const dims = d.dimensions || {};
  const dimBars = dimDefs.map(def => {
    const val = dims[def.key] || 0;
    const pct = Math.round(val / def.max * 100);
    return '<div class="qp-dim-row">' +
      '<div class="qp-dim-label">' + def.label + '</div>' +
      '<div class="qp-dim-track"><div class="qp-dim-fill" style="width:' + pct + '%;background:' + def.color + '"></div></div>' +
      '<div class="qp-dim-num" style="color:' + def.color + '">' + val + '<span style="font-size:.65rem;color:#999">/' + def.max + '</span></div>' +
    '</div>';
  }).join('');

  const mkItems = (arr, icon) => arr.length
    ? arr.map(t => '<div class="qp-item"><span class="qp-icon">' + icon + '</span><span>' + escHtml(t) + '</span></div>').join('')
    : '<div class="qp-item" style="color:#999"><span class="qp-icon">—</span><span>無</span></div>';

  const metaInfo = d.meta || {};
  qpBody.innerHTML =
    '<div class="qp-score-ring">' +
      '<div class="qp-ring-num" style="color:' + d.lightColor + '">' + d.score + '</div>' +
      '<div>' +
        '<div class="qp-light-label" style="color:' + d.lightColor + '">' + d.lightLabel + '</div>' +
        '<div style="font-size:.72rem;color:#666;margin-top:.2rem">總分 / 100</div>' +
        '<div style="font-size:.7rem;color:#888;margin-top:.15rem">' +
          (metaInfo.zhCount ? '中文 ' + metaInfo.zhCount + '字' : '') +
          (metaInfo.h2Count ? ' · H2 ' + metaInfo.h2Count + '個' : '') +
          (metaInfo.readingTime ? ' · 閱讀 ' + metaInfo.readingTime + '分' : '') +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="qp-dim-bars">' + dimBars + '</div>' +
    '<div class="qp-section">' +
      '<div class="qp-section-title">❌ 需要修正（' + (d.issues||[]).length + ' 項）</div>' +
      mkItems(d.issues||[], '❌') +
    '</div>' +
    '<div class="qp-section">' +
      '<div class="qp-section-title">⚠️ 建議優化（' + (d.warnings||[]).length + ' 項）</div>' +
      mkItems(d.warnings||[], '⚠️') +
    '</div>' +
    '<div class="qp-section">' +
      '<div class="qp-section-title">✅ 符合規範（' + (d.passes||[]).length + ' 項）</div>' +
      mkItems(d.passes||[], '✅') +
    '</div>';
}

// ── Editor Modal ──────────────────────────────────────────────────────────────
let editorSlug = null, editorType = null;
const editorOverlay  = document.getElementById('editor-modal-overlay');
const editorTextarea = document.getElementById('editor-textarea');
const editorPreview  = document.getElementById('editor-preview-pane');
const editorSaveBtn  = document.getElementById('editor-save-btn');
const editorSaveInfo = document.getElementById('editor-save-info');

document.getElementById('editor-modal-close').addEventListener('click', closeEditorModal);
document.getElementById('editor-cancel-btn').addEventListener('click', closeEditorModal);
editorOverlay.addEventListener('click', e => { if (e.target === editorOverlay) closeEditorModal(); });

function closeEditorModal() {
  editorOverlay.classList.remove('open');
  editorSlug = editorType = null;
}

function switchEditorTab(tab) {
  document.getElementById('etab-edit').classList.toggle('active', tab === 'edit');
  document.getElementById('etab-preview').classList.toggle('active', tab === 'preview');
  editorTextarea.style.display = tab === 'edit' ? '' : 'none';
  editorPreview.classList.toggle('active', tab === 'preview');
  if (tab === 'preview') editorPreview.innerHTML = editorTextarea.value;
}

async function openEditorModal(slug, title, type) {
  editorSlug = slug; editorType = type;
  document.getElementById('editor-modal-title').textContent = title || slug;
  const badge = document.getElementById('editor-type-badge');
  badge.textContent = type === 'published' ? '✅ 已發布' : '📅 排程文章';
  badge.className = 'editor-type-badge ' + type;
  editorTextarea.value = '⏳ 載入文章中…';
  editorSaveInfo.textContent = '修改後點擊「儲存」，將直接 commit 到 GitHub';
  editorSaveBtn.disabled = true;
  editorOverlay.classList.add('open');
  switchEditorTab('edit');

  // 從 GitHub raw 載入文章
  try {
    const dir = type === 'published' ? 'dist/articles' : 'dist/_scheduled';
    const rawUrl = 'https://raw.githubusercontent.com/stanleytsoubiz/BNotes/main/' + dir + '/' + slug + '.html';
    const res = await fetch(rawUrl + '?t=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    editorTextarea.value = await res.text();
    editorSaveBtn.disabled = false;
    const charCount = editorTextarea.value.replace(/<[^>]*>/g, '').replace(/\s+/g, '').length;
    const lineCount = editorTextarea.value.split('\n').length;
    editorSaveInfo.textContent = '字元: ' + editorTextarea.value.length.toLocaleString() + ' | 純文字: ' + charCount.toLocaleString() + ' | 行數: ' + lineCount + ' | 修改後點「儲存」';
  } catch(e) {
    editorTextarea.value = '// 載入失敗：' + e.message;
    editorSaveInfo.textContent = '載入失敗，請重試';
  }
}

editorSaveBtn.addEventListener('click', async () => {
  if (!editorSlug || editorSaveBtn.disabled) return;
  editorSaveBtn.disabled = true;
  editorSaveBtn.textContent = '⏳ 儲存中…';
  try {
    const res = await fetch('/api/edit-article', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ slug: editorSlug, type: editorType, content: editorTextarea.value })
    });
    const data = await res.json();
    if (data.ok) {
      showToast('✅ ' + data.message + '  Commit: ' + data.commit, 'success', 5000);
      closeEditorModal();
      if (editorType === 'published') loadPublished();
      else loadScheduled();
    } else {
      showToast('❌ ' + data.error, 'error', 8000);
    }
  } catch(e) {
    showToast('❌ 網路錯誤：' + e.message, 'error', 8000);
  } finally {
    editorSaveBtn.disabled = false;
    editorSaveBtn.textContent = '💾 儲存並發佈';
  }
});

// ── Published Article Quality Scan ────────────────────────────────────────────
async function scanPubArticle(slug, title) {
  try {
    const data = await fetchQualityPub(slug);
    pubQualityCache[slug] = data;
    renderPublished();
  } catch(e) { showToast('❌ 掃描失敗：' + e.message, 'error'); }
}

async function fetchQualityPub(slug) {
  const res = await fetch('/api/quality-scan?slug=' + encodeURIComponent(slug) + '&type=published&t=' + Date.now(), {cache:'no-store'});
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || '掃描失敗');
  return data;
}

async function openQualityPanelPub(slug, title) {
  qpTitle.textContent = title || slug;
  qpSlugEl.textContent = slug + '.html';
  qpBody.innerHTML = '<div class="qp-loading">🔍 掃描已發布文章品質…</div>';
  qualityPanel.classList.add('open');
  try {
    const cached = pubQualityCache[slug];
    const data = cached || await fetchQualityPub(slug);
    if (!pubQualityCache[slug]) pubQualityCache[slug] = data;
    renderQualityPanel(data);
  } catch(e) {
    qpBody.innerHTML = '<div class="qp-loading">❌ 掃描失敗：' + escHtml(e.message) + '</div>';
  }
}

async function autoScanPublished() {
  const items = articles.filter(a => !pubQualityCache[a.slug]);
  for (let i = 0; i < items.length && i < 10; i++) {  // 最多掃10篇避免超時
    const a = items[i];
    try {
      const data = await fetchQualityPub(a.slug);
      pubQualityCache[a.slug] = data;
      renderPublished();
    } catch(e) {
      pubQualityCache[a.slug] = { score:0, light:'red', lightLabel:'⚠ 掃描失敗', lightColor:'#999', dimensions:{}, issues:[e.message], warnings:[], passes:[] };
    }
    if (i < items.length - 1) await new Promise(r => setTimeout(r, 500));
  }
}

// 自動批次掃描：載入排程文章後，背景逐一掃描（延遲避免 Rate Limit）
async function autoScanScheduled() {
  const items = scheduled.filter(a => !qualityCache[a.slug]);
  for (let i = 0; i < items.length && i < 8; i++) {  // 最多掃8篇，避免 Rate Limit
    const a = items[i];
    try {
      const data = await fetchQuality(a.slug);
      qualityCache[a.slug] = data;
      renderScheduled(); // 即時更新燈號
    } catch(e) {
      qualityCache[a.slug] = { score:0, light:'red', lightLabel:'⚠ 掃描失敗', lightColor:'#999', dimensions:{}, issues:[e.message], warnings:[], passes:[] };
    }
    if (i < items.length - 1) await new Promise(r => setTimeout(r, 400)); // 400ms 間隔
  }
}

// ── Reschedule Modal ──────────────────────────────────────────────────────────
let rescheduleSlug = null;
function openRescheduleModal(slug, title, currentDate) {
  rescheduleSlug = slug;
  document.getElementById('modal-reschedule-msg').innerHTML =
    '\u8abf\u6574\u6392\u7a0b\u6587\u7ae0\uff1a<strong>\u300a' + escHtml(title) + '\u300b</strong><br><small>\u76ee\u524d\u65e5\u671f\uff1a' + currentDate + '</small>';
  document.getElementById('reschedule-date-input').value = currentDate || '';
  document.getElementById('modal-reschedule').classList.add('open');
}
document.getElementById('btn-reschedule-cancel').addEventListener('click', () => {
  document.getElementById('modal-reschedule').classList.remove('open'); rescheduleSlug = null;
});
document.getElementById('btn-reschedule-confirm').addEventListener('click', async () => {
  if (!rescheduleSlug) return;
  const newDate = document.getElementById('reschedule-date-input').value.trim();
  if (!newDate) { showToast('請選擇新的發布日期', 'error'); return; }
  const slug = rescheduleSlug;
  document.getElementById('modal-reschedule').classList.remove('open');
  showLoading('\u6b63\u5728\u91cd\u65b0\u5b89\u6392\u300a' + slug + '\u300b\u81f3 ' + newDate + '\u2026');
  try {
    const res  = await fetch('/api/reschedule', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({slug, new_date: newDate})});
    const data = await res.json(); hideLoading();
    if (data.ok) {
      showToast('\u2705 ' + data.message + '  Commit: ' + data.commit, 'success', 5000);
      await loadScheduled();
    } else showToast('\u274c ' + data.error, 'error', 8000);
  } catch(e) { hideLoading(); showToast('\u274c \u7db2\u8def\u932f\u8aa4\uff1a' + e.message, 'error', 8000); }
  rescheduleSlug = null;
});

// ── Publish Now Modal ─────────────────────────────────────────────────────────
let publishNowSlug = null;
function openPublishNowModal(slug, title) {
  publishNowSlug = slug;
  document.getElementById('modal-publish-now-msg').innerHTML =
    '\u78ba\u8a8d\u7acb\u523b\u767c\u5e03\uff1a<strong>\u300a' + escHtml(title) + '\u300b</strong><br><small>\u6587\u7ae0\u65e5\u671f\u5c07\u66f4\u65b0\u70ba\u4eca\u5929\uff0c\u4e26\u7acb\u523b\u79fb\u81f3\u5df2\u767c\u5e03\u5217\u8868\uff0cCloudflare 30\u201360 \u79d2\u5167\u91cd\u65b0\u90e8\u7f72\u3002</small>';
  document.getElementById('modal-publish-now').classList.add('open');
}
document.getElementById('btn-publish-now-cancel').addEventListener('click', () => {
  document.getElementById('modal-publish-now').classList.remove('open'); publishNowSlug = null;
});
document.getElementById('btn-publish-now-confirm').addEventListener('click', async () => {
  if (!publishNowSlug) return;
  const slug = publishNowSlug;
  document.getElementById('modal-publish-now').classList.remove('open');
  showLoading('\u26a1 \u6b63\u5728\u7acb\u523b\u767c\u5e03\u300a' + slug + '\u300b\u2026');
  try {
    const res  = await fetch('/api/publish-now', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({slug})});
    const data = await res.json(); hideLoading();
    if (data.ok) {
      showToast('\u2705 \u767c\u5e03\u6210\u529f\uff01Commit: ' + data.commit, 'success', 5000);
      scheduled = scheduled.filter(a => a.slug !== slug);
      const overdue = scheduled.filter(a=>a.overdue).length;
      document.getElementById('stat-scheduled').textContent = scheduled.length;
      document.getElementById('stat-overdue').textContent = overdue;
      document.getElementById('badge-sched').textContent = scheduled.length + (overdue>0?' ⚠️':'');
      renderScheduled();
      setTimeout(loadPublished, 2000);
    } else showToast('\u274c ' + data.error, 'error', 8000);
  } catch(e) { hideLoading(); showToast('\u274c \u7db2\u8def\u932f\u8aa4\uff1a' + e.message, 'error', 8000); }
  publishNowSlug = null;
});

// ── UI helpers ────────────────────────────────────────────────────────────────
function showLoading(msg){loadingMsg.textContent=msg;loadingOv.classList.add('open');}
function hideLoading(){loadingOv.classList.remove('open');}
let toastTimer;
function showToast(msg,type='success',dur=4000){
  toast.textContent=msg;toast.className='show ' + type;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.className='';},dur);
}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ── Copy Modal ────────────────────────────────────────────────────────────
let copySlug = null;
function openCopyModal(slug, title) {
  copySlug = slug;
  const d = new Date(); d.setDate(d.getDate()+7);
  document.getElementById('modal-copy-msg').innerHTML = '複製文章：<strong>《'+escHtml(title)+'》</strong><br><small>為此文章建立排程草稿：</small>';
  document.getElementById('copy-date-input').value = d.toISOString().slice(0,10);
  document.getElementById('modal-copy').classList.add('open');
}
document.getElementById('btn-copy-cancel')?.addEventListener('click',()=>{document.getElementById('modal-copy').classList.remove('open');copySlug=null;});
document.getElementById('btn-copy-confirm')?.addEventListener('click',async()=>{
  if(!copySlug) return;
  const newDate=document.getElementById('copy-date-input').value.trim();
  if(!newDate){showToast('請選擇發布日期','error');return;}
  const slug=copySlug; document.getElementById('modal-copy').classList.remove('open');
  showLoading('正在複製《'+slug+'》至排程…');
  try{
    const res=await fetch('/api/copy-article',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug,new_date:newDate})});
    const data=await res.json(); hideLoading();
    if(data.ok){showToast('✅ 複製成功！新排程：'+data.new_slug+' Commit:'+data.commit,'success',6000);await loadScheduled();}
    else showToast('❌ '+data.error,'error',8000);
  }catch(e){hideLoading();showToast('❌ '+e.message,'error',8000);}
  copySlug=null;
});


// ── 縮圖錯誤 fallback ─────────────────────────────────────────────────────
function imgError(el) {
  const ph = document.createElement('div');
  ph.className = 'thumb-placeholder';
  ph.textContent = '☕';
  el.parentNode.replaceChild(ph, el);
}
// ── Batch Publish Overdue ─────────────────────────────────────────────────
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── ⚡ 批次發布逾期文章 ────────────────────────────────
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
document.getElementById('btn-batch-publish')?.addEventListener('click', () => {
  const overdueSlugs = scheduled.filter(a => a.overdue);
  const cnt = overdueSlugs.length;
  if (!cnt) { showToast('目前沒有逾期文章', 'success'); return; }
  const msgEl = document.getElementById('modal-batch-msg');
  if (msgEl) msgEl.innerHTML =
    '確認批次發布 <strong>' + cnt + ' 篇</strong>逾期文章？<br>' +
    '<small style="color:var(--muted)">日期將自動更新為今天，無法復原。</small>';
  document.getElementById('modal-batch')?.classList.add('open');
});

document.getElementById('btn-batch-cancel')?.addEventListener('click', () => {
  document.getElementById('modal-batch')?.classList.remove('open');
});

document.getElementById('btn-batch-confirm')?.addEventListener('click', async () => {
  document.getElementById('modal-batch')?.classList.remove('open');
  const slugs = scheduled.filter(a => a.overdue).map(a => a.slug);
  if (!slugs.length) return;
  let done = 0, fail = 0;
  for (const slug of slugs) {
    showLoading('批次發布 (' + (done + fail + 1) + '/' + slugs.length + ')：' + slug);
    try {
      const r = await fetch('/api/publish-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug })
      });
      const d = await r.json();
      if (d.ok) done++; else { fail++; console.warn('batch fail:', slug, d.error); }
    } catch (e) { fail++; console.error('batch error:', slug, e); }
    await new Promise(r => setTimeout(r, 1000));
  }
  hideLoading();
  const msg = '批次發布：成功 ' + done + ' 篇' + (fail ? '，失敗 ' + fail + ' 篇' : '');
  showToast(msg, done > 0 ? 'success' : 'error', 7000);
  await loadScheduled();
  if (done > 0) setTimeout(loadPublished, 2000);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── 📊 內容統計面板 ────────────────────────────────────
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
document.getElementById('btn-stats')?.addEventListener('click', () => {
  const CAT_ZH = {
    'pour-over':'手沖技法','espresso':'義式咖啡','equipment':'器材評測',
    'terroir':'產地風土','science':'冲泡科學','lifestyle':'咖啡生活'
  };
  const catStats = {};
  [...articles, ...scheduled].forEach(a => {
    const c = CAT_ZH[a.cat || a.category] || a.cat || a.category || '其他';
    catStats[c] = (catStats[c] || 0) + 1;
  });
  const total   = articles.length + scheduled.length;
  const overdue = scheduled.filter(a => a.overdue).length;
  const soon    = scheduled.filter(a => !a.overdue && a.daysUntil !== null && a.daysUntil <= 7).length;

  const catRows = Object.entries(catStats)
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => {
      const pct = Math.round(n / total * 100);
      return '<div style="margin:.3rem 0">' +
        '<div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:.2rem">' +
        '<span>' + c + '</span><span style="font-weight:700">' + n + '</span></div>' +
        '<div style="background:#f0ebe2;border-radius:.3rem;height:6px">' +
        '<div style="background:var(--gold);border-radius:.3rem;height:100%;width:' + pct + '%"></div>' +
        '</div></div>';
    }).join('');

  const overdueList = scheduled.filter(a => a.overdue)
    .sort((a, b) => (a.date||'') < (b.date||'') ? -1 : 1)
    .slice(0, 8)
    .map(a => '<div style="font-size:.78rem;padding:.25rem 0;border-bottom:1px solid #f0ebe2;color:#d93025">' +
      '● ' + escHtml(a.title.substring(0, 38)) + (a.title.length > 38 ? '…' : '') +
      ' <span style="opacity:.7">(' + a.date + ')</span></div>')
    .join('');

  const el = document.getElementById('stats-content');
  if (!el) return;
  el.innerHTML =
    '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:.6rem;margin-bottom:1rem">' +
    statCard('📰', '已發布', articles.length) +
    statCard('📅', '排程中', scheduled.length) +
    statCard('⚠️', '逾期', overdue, overdue > 0 ? '#d93025' : '') +
    statCard('⏰', '7天內到期', soon, soon > 0 ? '#c47e2b' : '') +
    '</div>' +
    '<h4 style="font-size:.82rem;font-weight:700;margin-bottom:.6rem;color:var(--muted)">📊 各分類分佈</h4>' +
    catRows +
    (overdueList
      ? '<h4 style="margin:.9rem 0 .4rem;font-size:.82rem;font-weight:700;color:#d93025">⚠️ 逾期文章清單</h4>' + overdueList
      : '<div style="margin-top:.9rem;color:var(--muted);font-size:.82rem">✅ 目前無逾期文章</div>');

  document.getElementById('modal-stats')?.classList.add('open');
});

function statCard(icon, label, val, color) {
  return '<div style="background:#fdf8f2;border:1px solid var(--border);border-radius:.5rem;padding:.7rem;text-align:center">' +
    '<div style="font-size:1.5rem">' + icon + '</div>' +
    '<div style="font-size:1.4rem;font-weight:800;color:' + (color || 'var(--dark)') + '">' + val + '</div>' +
    '<div style="font-size:.72rem;color:var(--muted)">' + label + '</div></div>';
}

document.getElementById('btn-stats-close')?.addEventListener('click', () => {
  document.getElementById('modal-stats')?.classList.remove('open');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ── 📋 快速複製已發布文章 ────────────────────────────
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
document.getElementById('btn-copy-cancel')?.addEventListener('click', () => {
  document.getElementById('modal-copy')?.classList.remove('open');
});

document.getElementById('btn-copy-confirm')?.addEventListener('click', async () => {
  const slug = document.getElementById('modal-copy')?.dataset.slug;
  if (!slug) return;
  document.getElementById('modal-copy')?.classList.remove('open');
  showLoading('複製文章中...');
  try {
    const r = await fetch('/api/copy-article', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug })
    });
    const d = await r.json();
    hideLoading();
    if (d.ok) {
      showToast('✅ 複製成功！新 slug: ' + d.newSlug, 'success', 7000);
      await loadScheduled();
    } else {
      showToast('❌ 複製失敗：' + (d.error || '未知錯誤'), 'error', 8000);
    }
  } catch (e) {
    hideLoading();
    showToast('❌ 網路錯誤：' + e.message, 'error', 8000);
  }
});

// ── 關閉 Modal（點擊遮罩）───────────────────────────────
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ── ESC 關閉 Modal ─────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});
