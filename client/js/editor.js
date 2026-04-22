/**
 * Lightweight markdown editor for contenteditable.
 * Supports: # heading, * unordered list, 1. ordered list, > blockquote, --- hr
 */

// --- Helpers ---

function esc(text) {
  var d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function ancestor(node, tag) {
  while (node) {
    if (node.tagName === tag) return node;
    node = node.parentNode;
  }
}

function anyAncestor(node, tags) {
  while (node) {
    if (tags.indexOf(node.tagName) > -1) return node;
    node = node.parentNode;
  }
}

function blockParent(node, root) {
  var n = node;
  while (n && n.parentNode !== root) n = n.parentNode;
  return n && n !== root ? n : null;
}

function placeCursor(el) {
  var sel = window.getSelection();
  var r = document.createRange();
  r.setStart(el.firstChild || el, 0);
  r.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r);
}

function emptyDiv() {
  var d = document.createElement('div');
  d.appendChild(document.createElement('br'));
  return d;
}

// --- Undo Manager ---

function Undo(el) {
  this.el = el;
  this.stack = [{ h: el.innerHTML, c: null }];
  this.i = 0;
  this.locked = false;
}

Undo.prototype.save = function () {
  if (this.locked) return;
  var h = this.el.innerHTML;
  if (this.stack[this.i] && this.stack[this.i].h === h) return;
  this.stack.splice(this.i + 1);
  this.stack.push({ h: h, c: this._cursor() });
  if (this.stack.length > 100) this.stack.shift();
  this.i = this.stack.length - 1;
};

Undo.prototype.undo = function () {
  if (this.i <= 0) return;
  this.stack[this.i].c = this._cursor();
  this.i--;
  this._apply(this.stack[this.i]);
};

Undo.prototype.redo = function () {
  if (this.i >= this.stack.length - 1) return;
  this.i++;
  this._apply(this.stack[this.i]);
};

Undo.prototype._apply = function (state) {
  this.locked = true;
  this.el.innerHTML = state.h;
  this._setCursor(state.c);
  this.locked = false;
};

Undo.prototype._cursor = function () {
  var sel = window.getSelection();
  if (!sel.rangeCount) return null;
  var r = sel.getRangeAt(0);
  return {
    sp: this._path(r.startContainer), so: r.startOffset,
    ep: this._path(r.endContainer), eo: r.endOffset
  };
};

Undo.prototype._setCursor = function (c) {
  if (!c) return;
  try {
    var s = this._node(c.sp), e = this._node(c.ep);
    if (!s || !e) return;
    var r = document.createRange();
    r.setStart(s, Math.min(c.so, s.length || s.childNodes.length));
    r.setEnd(e, Math.min(c.eo, e.length || e.childNodes.length));
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  } catch (x) {}
};

Undo.prototype._path = function (node) {
  var p = [], n = node;
  while (n && n !== this.el) {
    p.unshift(Array.prototype.indexOf.call(n.parentNode.childNodes, n));
    n = n.parentNode;
  }
  return p;
};

Undo.prototype._node = function (path) {
  var n = this.el;
  for (var i = 0; i < path.length; i++) {
    if (!n.childNodes[path[i]]) return null;
    n = n.childNodes[path[i]];
  }
  return n;
};

// --- Conversion ---

var FORMATTED = ['H2', 'UL', 'OL', 'BLOCKQUOTE', 'HR'];

export function toHtml(text) {
  if (!text) return '';
  var lines = text.split('\n'), html = '', i = 0;

  while (i < lines.length) {
    var ln = lines[i];

    if (ln.startsWith('# ')) {
      html += '<h2>' + esc(ln.slice(2)) + '</h2>';
      i++;
    } else if (ln === '---') {
      html += '<hr>';
      i++;
    } else if (ln.startsWith('* ')) {
      html += '<ul>';
      while (i < lines.length && lines[i].startsWith('* ')) {
        var c = lines[i].slice(2);
        html += '<li>' + (c ? esc(c) : '<br>') + '</li>';
        i++;
      }
      html += '</ul>';
    } else if (/^\d+\. /.test(ln)) {
      html += '<ol>';
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        var c = lines[i].replace(/^\d+\. /, '');
        html += '<li>' + (c ? esc(c) : '<br>') + '</li>';
        i++;
      }
      html += '</ol>';
    } else if (ln.startsWith('> ') || ln === '>') {
      html += '<blockquote>';
      while (i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>')) {
        var c = lines[i] === '>' ? '' : lines[i].slice(2);
        html += '<div>' + (c ? esc(c) : '<br>') + '</div>';
        i++;
      }
      html += '</blockquote>';
    } else if (ln === '') {
      html += '<div><br></div>';
      i++;
    } else {
      html += '<div>' + esc(ln) + '</div>';
      i++;
    }
  }
  return html;
}

export function toMarkdown(el) {
  var lines = [], ch = el.childNodes;

  for (var i = 0; i < ch.length; i++) {
    var n = ch[i];
    if (n.nodeType === 3) { if (n.textContent) lines.push(n.textContent); continue; }
    if (n.nodeType !== 1) continue;

    switch (n.tagName) {
      case 'H2':
        lines.push('# ' + n.textContent);
        break;
      case 'UL':
        for (var j = 0; j < n.children.length; j++)
          lines.push('* ' + n.children[j].textContent);
        break;
      case 'OL':
        for (var j = 0; j < n.children.length; j++)
          lines.push((j + 1) + '. ' + n.children[j].textContent);
        break;
      case 'BLOCKQUOTE':
        for (var j = 0; j < n.childNodes.length; j++) {
          var t = n.childNodes[j].textContent;
          lines.push(t ? '> ' + t : '>');
        }
        break;
      case 'HR':
        lines.push('---');
        break;
      default:
        lines.push(n.textContent);
    }
  }
  return lines.join('\n');
}

export function stripMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/^# /gm, '')
    .replace(/^\* /gm, '')
    .replace(/^\d+\. /gm, '')
    .replace(/^> /gm, '')
    .replace(/^---$/gm, '');
}

// --- Input Rules ---

function checkRules(editor, undo) {
  var sel = window.getSelection();
  if (!sel.rangeCount || !sel.isCollapsed) return;

  var node = sel.anchorNode;
  if (!node || anyAncestor(node, FORMATTED)) return;

  var block = blockParent(node, editor);
  if (!block) return;

  var text = block.textContent.replace(/\u00A0/g, ' ');
  if (node.nodeType === 3 && sel.anchorOffset !== node.textContent.length) return;

  if (text === '# ') {
    undo.save();
    var h2 = document.createElement('h2');
    h2.appendChild(document.createElement('br'));
    editor.replaceChild(h2, block);
    placeCursor(h2);
    undo.save();
  } else if (text === '* ') {
    undo.save();
    var ul = document.createElement('ul');
    var li = document.createElement('li');
    li.appendChild(document.createElement('br'));
    ul.appendChild(li);
    editor.replaceChild(ul, block);
    placeCursor(li);
    undo.save();
  } else if (/^\d+\. $/.test(text)) {
    undo.save();
    var ol = document.createElement('ol');
    var li = document.createElement('li');
    li.appendChild(document.createElement('br'));
    ol.appendChild(li);
    editor.replaceChild(ol, block);
    placeCursor(li);
    undo.save();
  } else if (text === '> ') {
    undo.save();
    var bq = document.createElement('blockquote');
    var div = emptyDiv();
    bq.appendChild(div);
    editor.replaceChild(bq, block);
    placeCursor(div);
    undo.save();
  } else if (text === '---') {
    undo.save();
    var hr = document.createElement('hr');
    var div = emptyDiv();
    editor.replaceChild(hr, block);
    editor.insertBefore(div, hr.nextSibling);
    placeCursor(div);
    undo.save();
  }
}

// --- Key Handlers ---

function onEnter(editor, e) {
  var sel = window.getSelection();
  if (!sel.rangeCount || !sel.isCollapsed) return;

  // Empty list item → exit list
  var li = ancestor(sel.anchorNode, 'LI');
  if (li && !li.textContent) {
    e.preventDefault();
    var list = li.parentNode;
    var div = emptyDiv();

    if (list.children.length === 1) {
      editor.replaceChild(div, list);
    } else if (li === list.lastElementChild) {
      list.removeChild(li);
      editor.insertBefore(div, list.nextSibling);
    } else {
      var nl = document.createElement(list.tagName);
      while (li.nextSibling) nl.appendChild(li.nextSibling);
      list.removeChild(li);
      editor.insertBefore(div, list.nextSibling);
      if (nl.children.length) editor.insertBefore(nl, div.nextSibling);
    }
    placeCursor(div);
    return;
  }

  // Empty line in blockquote → exit blockquote
  var bq = ancestor(sel.anchorNode, 'BLOCKQUOTE');
  if (bq) {
    var b = sel.anchorNode;
    while (b && b.parentNode !== bq) b = b.parentNode;
    if (b && !b.textContent) {
      e.preventDefault();
      var div = emptyDiv();
      if (bq.childNodes.length <= 1) {
        editor.replaceChild(div, bq);
      } else {
        var nbq = document.createElement('blockquote');
        while (b.nextSibling) nbq.appendChild(b.nextSibling);
        bq.removeChild(b);
        editor.insertBefore(div, bq.nextSibling);
        if (nbq.childNodes.length) editor.insertBefore(nbq, div.nextSibling);
      }
      placeCursor(div);
    }
  }
}

function onBackspace(editor, e) {
  var sel = window.getSelection();
  if (!sel.rangeCount || !sel.isCollapsed || sel.anchorOffset !== 0) return;

  // Verify cursor is at absolute start of the block
  var n = sel.anchorNode;
  while (n && n !== editor) {
    if (n.previousSibling) return;
    n = n.parentNode;
  }

  n = sel.anchorNode;

  // Heading → div
  var h2 = ancestor(n, 'H2');
  if (h2 && h2.parentNode === editor) {
    e.preventDefault();
    var div = document.createElement('div');
    while (h2.firstChild) div.appendChild(h2.firstChild);
    if (!div.firstChild) div.appendChild(document.createElement('br'));
    editor.replaceChild(div, h2);
    placeCursor(div);
    return;
  }

  // List item → unwrap
  var li = ancestor(n, 'LI');
  if (li) {
    e.preventDefault();
    var list = li.parentNode;
    var div = document.createElement('div');
    while (li.firstChild) div.appendChild(li.firstChild);
    if (!div.firstChild) div.appendChild(document.createElement('br'));

    if (list.children.length === 1) {
      editor.replaceChild(div, list);
    } else if (li === list.firstElementChild) {
      editor.insertBefore(div, list);
      list.removeChild(li);
    } else {
      var nl = document.createElement(list.tagName);
      while (li.nextSibling) nl.appendChild(li.nextSibling);
      list.removeChild(li);
      editor.insertBefore(div, list.nextSibling);
      if (nl.children.length) editor.insertBefore(nl, div.nextSibling);
    }
    placeCursor(div);
    return;
  }

  // Blockquote first line → unwrap
  var bq = ancestor(n, 'BLOCKQUOTE');
  if (bq && bq.parentNode === editor) {
    var first = bq.firstChild;
    var inFirst = false;
    var check = sel.anchorNode;
    while (check && check !== bq) {
      if (check === first) { inFirst = true; break; }
      check = check.parentNode;
    }
    if (!inFirst) return;

    e.preventDefault();
    var div = document.createElement('div');
    while (first.firstChild) div.appendChild(first.firstChild);
    if (!div.firstChild) div.appendChild(document.createElement('br'));
    if (bq.childNodes.length <= 1) {
      editor.replaceChild(div, bq);
    } else {
      editor.insertBefore(div, bq);
      bq.removeChild(first);
    }
    placeCursor(div);
  }
}

// --- Setup ---

export function setupEditor(el) {
  var undo = new Undo(el);
  var composing = false;
  var timer;

  function saveDebounced() {
    clearTimeout(timer);
    timer = setTimeout(function () { undo.save(); }, 300);
  }

  function handleInput() {
    if (!composing) {
      checkRules(el, undo);
      saveDebounced();
    }
  }

  function handleKeydown(e) {
    var mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo.undo(); return; }
    if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); undo.redo(); return; }
    if (e.key === 'Enter' && !e.shiftKey) { undo.save(); onEnter(el, e); }
    if (e.key === 'Backspace') { undo.save(); onBackspace(el, e); }
  }

  function handlePaste(e) {
    e.preventDefault();
    var text = e.clipboardData.getData('text/plain');
    if (/^(#\s|\*\s|\d+\.\s|>\s|---$)/m.test(text)) {
      document.execCommand('insertHTML', false, toHtml(text));
    } else {
      document.execCommand('insertText', false, text);
    }
    saveDebounced();
  }

  function compStart() { composing = true; }
  function compEnd() { composing = false; }

  el.addEventListener('input', handleInput);
  el.addEventListener('keydown', handleKeydown);
  el.addEventListener('paste', handlePaste);
  el.addEventListener('compositionstart', compStart);
  el.addEventListener('compositionend', compEnd);

  return function () {
    clearTimeout(timer);
    el.removeEventListener('input', handleInput);
    el.removeEventListener('keydown', handleKeydown);
    el.removeEventListener('paste', handlePaste);
    el.removeEventListener('compositionstart', compStart);
    el.removeEventListener('compositionend', compEnd);
  };
}
