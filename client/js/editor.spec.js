import { toHtml, toMarkdown, stripMarkdown } from './editor';

describe('editor', () => {

  describe('toHtml', () => {
    it('should return empty string for falsy input', () => {
      expect(toHtml('')).to.equal('');
      expect(toHtml(null)).to.equal('');
      expect(toHtml(undefined)).to.equal('');
    });

    it('should wrap plain text lines in divs', () => {
      expect(toHtml('hello')).to.equal('<div>hello</div>');
      expect(toHtml('line 1\nline 2')).to.equal('<div>line 1</div><div>line 2</div>');
    });

    it('should convert empty lines to div with br', () => {
      expect(toHtml('a\n\nb')).to.equal('<div>a</div><div><br></div><div>b</div>');
    });

    it('should escape html in plain text', () => {
      expect(toHtml('<script>')).to.equal('<div>&lt;script&gt;</div>');
    });

    it('should convert # to h2', () => {
      expect(toHtml('# heading')).to.equal('<h2>heading</h2>');
    });

    it('should convert * lines to ul', () => {
      expect(toHtml('* a\n* b')).to.equal('<ul><li>a</li><li>b</li></ul>');
    });

    it('should convert empty * line to li with br', () => {
      expect(toHtml('* ')).to.equal('<ul><li><br></li></ul>');
    });

    it('should convert numbered lines to ol', () => {
      expect(toHtml('1. a\n2. b')).to.equal('<ol><li>a</li><li>b</li></ol>');
    });

    it('should convert > lines to blockquote', () => {
      expect(toHtml('> a\n> b')).to.equal('<blockquote><div>a</div><div>b</div></blockquote>');
    });

    it('should handle bare > as empty blockquote line', () => {
      expect(toHtml('>')).to.equal('<blockquote><div><br></div></blockquote>');
    });

    it('should convert --- to hr', () => {
      expect(toHtml('---')).to.equal('<hr>');
    });

    it('should handle mixed content', () => {
      var md = '# title\ntext\n* a\n* b\n---\n> quote';
      var html = toHtml(md);
      expect(html).to.contain('<h2>title</h2>');
      expect(html).to.contain('<div>text</div>');
      expect(html).to.contain('<ul><li>a</li><li>b</li></ul>');
      expect(html).to.contain('<hr>');
      expect(html).to.contain('<blockquote><div>quote</div></blockquote>');
    });

    it('should group consecutive * lines into one ul', () => {
      var html = toHtml('* a\n* b\ntext\n* c');
      expect(html).to.equal('<ul><li>a</li><li>b</li></ul><div>text</div><ul><li>c</li></ul>');
    });

    it('should group consecutive numbered lines into one ol', () => {
      var html = toHtml('1. a\n2. b\ntext\n1. c');
      expect(html).to.equal('<ol><li>a</li><li>b</li></ol><div>text</div><ol><li>c</li></ol>');
    });
  });

  describe('toMarkdown', () => {
    var el;

    beforeEach(() => {
      el = document.createElement('div');
    });

    it('should convert divs to plain text lines', () => {
      el.innerHTML = '<div>hello</div><div>world</div>';
      expect(toMarkdown(el)).to.equal('hello\nworld');
    });

    it('should convert h2 to # prefix', () => {
      el.innerHTML = '<h2>heading</h2>';
      expect(toMarkdown(el)).to.equal('# heading');
    });

    it('should convert ul to * prefixed lines', () => {
      el.innerHTML = '<ul><li>a</li><li>b</li></ul>';
      expect(toMarkdown(el)).to.equal('* a\n* b');
    });

    it('should convert ol to numbered lines', () => {
      el.innerHTML = '<ol><li>a</li><li>b</li></ol>';
      expect(toMarkdown(el)).to.equal('1. a\n2. b');
    });

    it('should convert blockquote to > prefixed lines', () => {
      el.innerHTML = '<blockquote><div>a</div><div>b</div></blockquote>';
      expect(toMarkdown(el)).to.equal('> a\n> b');
    });

    it('should convert empty blockquote line to bare >', () => {
      el.innerHTML = '<blockquote><div><br></div></blockquote>';
      expect(toMarkdown(el)).to.equal('>');
    });

    it('should convert hr to ---', () => {
      el.innerHTML = '<hr>';
      expect(toMarkdown(el)).to.equal('---');
    });

    it('should handle text nodes', () => {
      el.appendChild(document.createTextNode('hello'));
      expect(toMarkdown(el)).to.equal('hello');
    });

    it('should handle mixed content', () => {
      el.innerHTML = '<h2>title</h2><div>text</div><ul><li>a</li></ul><hr><blockquote><div>q</div></blockquote>';
      expect(toMarkdown(el)).to.equal('# title\ntext\n* a\n---\n> q');
    });
  });

  describe('round-trip', () => {
    var el;

    beforeEach(() => {
      el = document.createElement('div');
    });

    function roundTrip(md) {
      el.innerHTML = toHtml(md);
      return toMarkdown(el);
    }

    it('should round-trip plain text', () => {
      expect(roundTrip('hello\nworld')).to.equal('hello\nworld');
    });

    it('should round-trip headings', () => {
      expect(roundTrip('# heading')).to.equal('# heading');
    });

    it('should round-trip unordered lists', () => {
      expect(roundTrip('* a\n* b')).to.equal('* a\n* b');
    });

    it('should round-trip ordered lists', () => {
      expect(roundTrip('1. a\n2. b')).to.equal('1. a\n2. b');
    });

    it('should round-trip blockquotes', () => {
      expect(roundTrip('> a\n> b')).to.equal('> a\n> b');
    });

    it('should round-trip horizontal rules', () => {
      expect(roundTrip('text\n---')).to.equal('text\n---');
    });

    it('should round-trip mixed content', () => {
      var md = '# title\ntext\n* a\n* b\n1. x\n2. y\n> quote\n---\nend';
      expect(roundTrip(md)).to.equal(md);
    });
  });

  describe('stripMarkdown', () => {
    it('should return empty string for falsy input', () => {
      expect(stripMarkdown('')).to.equal('');
      expect(stripMarkdown(null)).to.equal('');
    });

    it('should strip # prefix', () => {
      expect(stripMarkdown('# heading')).to.equal('heading');
    });

    it('should strip * prefix', () => {
      expect(stripMarkdown('* item')).to.equal('item');
    });

    it('should strip numbered prefixes', () => {
      expect(stripMarkdown('1. first\n2. second')).to.equal('first\nsecond');
    });

    it('should strip > prefix', () => {
      expect(stripMarkdown('> quote')).to.equal('quote');
    });

    it('should strip ---', () => {
      expect(stripMarkdown('---')).to.equal('');
    });

    it('should leave plain text unchanged', () => {
      expect(stripMarkdown('hello world')).to.equal('hello world');
    });

    it('should handle mixed content', () => {
      expect(stripMarkdown('# title\ntext\n* a\n> b')).to.equal('title\ntext\na\nb');
    });
  });
});
