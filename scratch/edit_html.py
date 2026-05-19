import re
import sys

file_path = "c:\\Users\\Matheus Scorza\\Downloads\\poker-main\\poker-main\\docs\\design\\dashboard-v5-action-layer.html"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Title
content = re.sub(
    r'<title>.*?</title>',
    '<title>Dashboard v5 — Action Layer Prototype</title>',
    content
)

# 2. Add CSS
css_addition = """
  /* V5 TOGGLES */
  .design-toggles { display: flex; gap: 16px; font-size: 11.5px; font-family: var(--mono); color: var(--fg-3); }
  .design-toggles label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
  .design-toggles input { cursor: pointer; margin: 0; }
  /* V5 SCOPE HEADER */
  .scope-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding: 14px 22px; background: rgba(139,124,255,0.06); border: 1px solid var(--accent-border); border-radius: 10px; }
  .scope-header .conf-badge { font-family: var(--mono); font-size: 10.5px; padding: 4px 9px; background: rgba(109,191,141,0.12); color: var(--pos); border-radius: 5px; display: inline-flex; align-items: center; gap: 6px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
  .scope-header .conf-badge .dot { width: 6px; height: 6px; background: var(--pos); border-radius: 50%; box-shadow: 0 0 0 3px rgba(109,191,141,0.2); }
  .scope-header .conf-text { font-family: var(--mono); font-size: 11.5px; color: var(--fg-3); margin-left: 14px; }
  .scope-header .warnings { font-size: 12px; color: var(--fg-3); display: flex; align-items: center; gap: 7px; font-weight: 500; }
  .scope-header .warnings svg { width: 14px; height: 14px; color: var(--pos); }
  /* CONDENSED MONEY HERO */
  .money-hero { transition: all 0.3s cubic-bezier(0.4,0,0.2,1); }
  .money-hero.condensed { padding: 24px 28px; margin-bottom: 16px; }
  .money-hero.condensed .mh-money { font-size: 48px; }
  .money-hero.condensed .mh-money .cents { font-size: 28px; }
  .money-hero.condensed .chip-stack { transform: scale(0.65) translate(40px, 80px); transform-origin: bottom right; }
  .money-hero.condensed .mh-grid { gap: 24px; align-items: center; }
  .money-hero.condensed .mh-foot { margin-top: 12px; }
  /* DECISION CARD */
  .decision-card { background: linear-gradient(160deg, var(--panel) 0%, rgba(139,124,255,0.04) 100%); border: 1px solid var(--border); border-radius: 12px; padding: 28px 32px; margin-bottom: 16px; position: relative; overflow: hidden; }
  .decision-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--accent); }
  .dc-eye { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.16em; color: var(--accent-2); font-family: var(--mono); margin-bottom: 12px; font-weight: 600; }
  .dc-verdict { font-size: 22px; font-weight: 600; letter-spacing: -0.015em; color: var(--fg); margin-bottom: 8px; }
  .dc-reason { font-size: 14px; color: var(--fg-2); margin-bottom: 24px; line-height: 1.6; max-width: 700px; }
  .dc-actions { display: flex; gap: 12px; }
</style>
"""
content = content.replace("</style>", css_addition)

# 3. Add Toggles
toggles_html = """
    <div class="chrome-spacer"></div>
    <div class="design-toggles">
      <label><input type="checkbox" id="t-career" checked> Show Career Arc</label>
      <label><input type="checkbox" id="t-mh-size"> Condensed Money Hero</label>
    </div>
  </div>
"""
content = re.sub(
    r'<div class="chrome-spacer"></div>\s*<div class="chrome-note">.*?</div>\s*</div>',
    toggles_html,
    content,
    flags=re.DOTALL
)

# 4. Add Scope Header
scope_header = """
    <div class="scope-header">
      <div>
        <span class="conf-badge"><span class="dot"></span> HIGH CONFIDENCE</span>
        <span class="conf-text">Imported 10,716 hands &middot; 37 sessions &middot; 8 months</span>
      </div>
      <div class="warnings">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 8 L7 11 L12 4"/></svg>
        No missing tournament summaries.
      </div>
    </div>

    <div class="money-hero" id="money-hero">
"""
content = content.replace('<div class="money-hero">', scope_header)

# 5. Restructure cards using regex
# We need to extract the `.range`, `.blocker`, `.stack`, and `.kpi-strip` cards
# and drop the `.verdict` card.

kpi_strip_match = re.search(r'<!-- ============== KPI STRIP — CAROUSEL ============== -->(.*?)<div class="row row-2-43">', content, re.DOTALL)
if not kpi_strip_match:
    print("Could not find KPI strip")
    sys.exit(1)
kpi_strip = kpi_strip_match.group(0).replace('<div class="row row-2-43">', '')

range_match = re.search(r'<div class="card range">.*?</div>\s*</div>\s*<div class="row row-2-eq">', content, re.DOTALL)
if not range_match:
    print("Could not find Range card")
    sys.exit(1)
range_card = '<div class="card range">' + range_match.group(0).replace('<div class="card range">', '').replace('</div>\s*</div>\s*<div class="row row-2-eq">', '</div>')
# fix extraction tail
range_card = re.sub(r'</div>\s*</div>\s*<div class="row row-2-eq">', '</div>', range_card, flags=re.DOTALL)


blocker_match = re.search(r'<div class="card blocker">.*?</button>\s*</div>\s*</div>', content, re.DOTALL)
if not blocker_match:
    print("Could not find Blocker card")
    sys.exit(1)
blocker_card = blocker_match.group(0)

stack_match = re.search(r'<div class="card stack">.*?</div>\s*</div>\s*</div>\s*<div class="card strip">', content, re.DOTALL)
if not stack_match:
    print("Could not find Stack card")
    sys.exit(1)
stack_card = stack_match.group(0).replace('<div class="card strip">', '')
stack_card = re.sub(r'</div>\s*<div class="card strip">', '</div>', stack_card, flags=re.DOTALL)

# Delete the old section from kpi-strip to stack
old_section = re.search(r'<!-- ============== KPI STRIP — CAROUSEL ============== -->.*?<div class="card strip">', content, re.DOTALL)

new_section = """
    <div class="decision-card">
      <div class="dc-eye">DECISION</div>
      <div class="dc-verdict">Profitable sample. Fix BTN open width before adding volume.</div>
      <div class="dc-reason">Sample is sound across 250 tournaments. The single biggest swing is too-wide BTN opens vs late-position 3-bets &mdash; fixing it projects to recover ~28bb/100 and ~$60 over your next 100 tournaments.</div>
      <div class="dc-actions">
        <button class="btn">Review 1,142 BTN opens</button>
        <button class="btn-ghost">View all leaks</button>
      </div>
    </div>

    <div class="row row-2-eq">
""" + blocker_card + """
""" + range_card + """
    </div>

    <div class="row row-2-eq">
""" + stack_card + """
""" + kpi_strip + """
    </div>
    
    <div class="card strip">
"""

content = content.replace(old_section.group(0), new_section)

# 6. Slice Leak queue (strip) to 3 leaks instead of 5
content = re.sub(
    r'<span class="strip-meta">5 of 8 shown',
    '<span class="strip-meta">3 of 8 shown',
    content
)
# We will just remove rows 04 and 05 using regex
content = re.sub(
    r'<div class="strip-row">\s*<span class="strip-rank">04</span>.*?</div>\s*<div class="strip-row">\s*<span class="strip-rank">05</span>.*?</div>',
    '',
    content,
    flags=re.DOTALL
)

# 7. Add ID to career arc
content = content.replace('<div class="card arc">', '<div class="card arc" id="career-arc">')

# 8. Add JS for toggles
js_addition = """
  // =================== V5 DESIGN TOGGLES ===================
  const tCareer = document.getElementById('t-career');
  const arcEl = document.getElementById('career-arc');
  if (tCareer && arcEl) {
    tCareer.addEventListener('change', (e) => {
      arcEl.style.display = e.target.checked ? 'flex' : 'none';
    });
  }
  
  const tMhSize = document.getElementById('t-mh-size');
  const mhEl = document.getElementById('money-hero');
  if (tMhSize && mhEl) {
    tMhSize.addEventListener('change', (e) => {
      if (e.target.checked) mhEl.classList.add('condensed');
      else mhEl.classList.remove('condensed');
    });
  }
</script>
"""
content = content.replace("</script>", js_addition)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
