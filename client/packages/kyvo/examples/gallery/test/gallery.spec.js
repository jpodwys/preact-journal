// One spec per scenario, so an example cannot quietly stop doing what its page says. Specs drive the real App.
const { expect } = window.chai;
import { h, render } from 'kyvo/core';
import { App, nav, sync } from '../src/app.js';
import { scenarios } from '../src/scenarios.js';

const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const until = async (check, ms = 2000) => {
  for (const end = Date.now() + ms; ; await sleep(20)) {
    try { return check(); } catch (e) { if (Date.now() > end) throw e; }
  }
};

describe('gallery', () => {
  let host, clock;
  const demo = () => host.querySelector('.demo');
  const $ = selector => demo().querySelector(selector);
  const $$ = selector => Array.from(demo().querySelectorAll(selector));
  const button = (label, scope = demo()) => Array.from(scope.querySelectorAll('button')).find(b => b.textContent === label);
  const click = async (label, scope) => { button(label, scope).click(); await frame(); };
  const type = async (el, value, event = 'input') => { el.value = value; el.dispatchEvent(new Event(event, { bubbles: true })); await frame(); };
  const go = async id => { history.replaceState(null, '', '#/' + id); sync(); await frame(); };

  beforeEach(async () => {
    host = document.body.appendChild(document.createElement('div'));
    history.replaceState(null, '', '#/counter');
    sync();
    Object.assign(nav, { tab: 'demo', file: 0 });
    render(<App />, host);
    await frame();
  });
  afterEach(async () => {
    if (clock) clock.restore();
    clock = null;
    render(null, host);
    host.remove();
    await frame();
  });

  it('links every scenario, and each page shows its demo, its notes and exactly its source', async function () {
    this.timeout(30000);
    expect(host.querySelectorAll('nav a').length).to.equal(scenarios.length);
    for (const s of scenarios) {
      await go(s.id);
      expect(host.querySelector('h1').textContent, s.id).to.equal(s.title);
      expect(host.querySelector('.footgun')?.textContent, s.id).to.equal(s.footgun && 'Watch out: ' + s.footgun);
      expect(host.querySelector('.tip')?.textContent, s.id).to.equal(s.tip && 'Tip: ' + s.tip);
      expect(demo().children.length, s.id).to.be.above(0);
      expect(host.querySelector('pre').textContent).to.equal(s.files[0].source);
      expect(s.files[0].source).to.include("from 'kyvo/core'");
      expect(s.files[0].source).to.include('export default');
      expect(host.querySelectorAll('.files button').length, s.id).to.equal(s.files.length > 1 ? s.files.length : 0);
      expect(host.querySelector('nav a[aria-current]').getAttribute('href')).to.equal('#/' + s.id);
    }
  });

  it('colours comments, strings, keywords and tags without changing the text', async () => {
    await go('stopwatch');
    const code = host.querySelector('pre code');
    const kinds = kind => Array.from(code.querySelectorAll('.tok-' + kind), el => el.textContent);
    expect(kinds('comment')).to.include('// Read props.step here. A destructured `step` would keep its first value forever.');
    expect(kinds('comment')).to.include('{/* The timer exists exactly as long as the component does. */}');
    expect(kinds('string')).to.include("'kyvo/core'");
    expect(kinds('keyword')).to.include.members(['import', 'from', 'const', 'return', 'export', 'default']);
    expect(kinds('tag')).to.include.members(['<div', '</div', '<Ticker', '/>']);
    expect(kinds('attr')).to.include.members(['class', 'onclick', 'step']);
    expect(code.textContent).to.equal(scenarios.find(s => s.id === 'stopwatch').files[0].source);
  });

  it('keeps the demo state while the Code tab is open', async () => {
    await click('Clicked 0 times');
    const element = $('button');
    await click('Code', host);
    const code = host.querySelector('section[aria-label="Code"]');
    expect(demo().classList.contains('away')).to.equal(true);
    expect(code.classList.contains('away')).to.equal(false);
    await click('Demo', host);
    expect(demo().classList.contains('away')).to.equal(false);
    expect(code.classList.contains('away')).to.equal(true);
    expect($('button')).to.equal(element);
    expect(element.textContent).to.equal('Clicked 1 times');
  });

  it('counter: counts and resets', async () => {
    await click('Clicked 0 times');
    await click('Clicked 1 times');
    expect($('button').textContent).to.equal('Clicked 2 times');
    await click('Reset');
    expect($('button').textContent).to.equal('Clicked 0 times');
  });

  it('cart: adds, totals and removes', async () => {
    await go('cart');
    await click('Add Tea');
    await click('Add Mug');
    expect($('h3').textContent).to.equal('Cart (2)');
    expect($('.total').textContent).to.equal('Total: $13');
    await click('Remove');
    expect($('.total').textContent).to.equal('Total: $9');
  });

  it('todos: row state follows its todo when rows move', async () => {
    await go('todos');
    const row = text => $$('li').find(li => li.textContent.includes(text) || li.querySelector('input')?.value === text);
    await click('Edit', row('Water plants'));
    await click('To top', row('Call Sam'));
    expect($$('li')[1].querySelector('input').value).to.equal('Water plants');
    await type($('li input'), 'Water the plants');
    await type($('form input'), 'Buy stamps');
    $('form').dispatchEvent(new Event('submit', { cancelable: true }));
    await frame();
    expect($$('li').length).to.equal(3);
    expect(row('Water the plants')).to.exist;
    await click('Delete', row('Buy stamps'));
    expect($$('li').length).to.equal(2);
  });

  it('settings: every control changes the preview', async () => {
    await go('settings');
    await type($('select'), 'crimson', 'change');
    await type($('input[type=range]'), '24');
    $('input[value=compact]').click();
    $('input[type=checkbox]').click();
    await frame();
    const style = $('.preview').style;
    expect(style.getPropertyValue('--accent')).to.equal('crimson');
    expect([style.fontSize, style.lineHeight, style.fontWeight]).to.deep.equal(['24px', '1.2', '700']);
  });

  it('search: filters after a pause', async () => {
    await go('search');
    await type($('input'), 'al');
    await until(() => expect($('.count').textContent).to.equal('2 of 6'));
    expect($$('li').map(li => li.textContent)).to.deep.equal(['Alan Turing', 'Donald Knuth']);
  });

  it('preferences: saved on every change', async () => {
    await go('preferences');
    await type($('input'), 'Robin');
    $('input[type=checkbox]').click();
    expect(JSON.parse(localStorage.getItem('gallery:preferences'))).to.deep.equal({ name: 'Robin', newsletter: true });
    localStorage.removeItem('gallery:preferences');
  });

  it('stopwatch: the running timer picks up a new step, and stopping removes it', async () => {
    await go('stopwatch');
    clock = sinon.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    await click('Start');
    clock.tick(2000);
    await click('Step: 1');
    clock.tick(1000);
    await frame();
    expect($('.total').textContent).to.equal('Total: 4');
    await click('Stop');
    expect($('.total')).to.equal(null);
    expect(clock.countTimers ? clock.countTimers() : Object.keys(clock.timers || {}).length).to.equal(0);
  });

  it('modal: focuses its button and closes on Escape or Close', async () => {
    await go('modal');
    await click('Open modal');
    expect(document.activeElement).to.equal(button('Close'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await frame();
    expect($('[role=dialog]')).to.equal(null);
    await click('Open modal');
    await click('Close');
    expect($('[role=dialog]')).to.equal(null);
  });

  const card = label => demo().querySelector(`section[aria-label="${label}"] .card`);
  const name = label => card(label).querySelector('h3').textContent;

  it('profile: without a key the old user and message stay, with one the card starts over', async () => {
    await go('profile');
    await until(() => expect([name('Without a key'), name('With a key')]).to.deep.equal(['Ada', 'Ada']));
    for (const label of ['Without a key', 'With a key']) await type(card(label).querySelector('input'), 'hi Ada');
    await click('User 2');
    expect(name('With a key')).to.equal('Loading…');
    expect(card('With a key').querySelector('input').value).to.equal('');
    await until(() => expect(name('With a key')).to.equal('Grace'));
    expect(name('Without a key')).to.equal('Ada');
    expect(card('Without a key').querySelector('input').value).to.equal('hi Ada');
  });

  it('profile: shows an error, and ignores the answer for a card that is gone', async () => {
    await go('profile');
    await click('User 3');
    await until(() => expect(card('With a key').querySelector('[role=alert]').textContent).to.equal('No such user'));
    await click('User 1');
    await click('User 2');
    await sleep(500);
    expect(name('With a key')).to.equal('Grace');
  });

  it('metronome: a new speed replaces the timer and keeps the count', async () => {
    await go('profile');                       // start from elsewhere, so the timer below is created under the fake clock
    clock = sinon.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    await go('metronome');
    clock.tick(2000);
    await frame();
    expect($('.total').textContent).to.equal('2 beats');
    await click('Faster');
    clock.tick(1000);
    await frame();
    expect($('.total').textContent).to.equal('4 beats');
    await go('counter');
    expect(clock.countTimers ? clock.countTimers() : Object.keys(clock.timers || {}).length).to.equal(0);
  });

  it('notes: switching at once keeps the typing and saves it to the right note', async () => {
    await go('notes');
    await type($('textarea'), 'Buy oat milk');
    expect($('.status').textContent).to.equal('Saving…');
    await click('Note 2');
    expect($('textarea').value).to.equal('Call Sam');
    await click('Note 1');
    expect($('textarea').value).to.equal('Buy oat milk');
    await until(() => expect($('.server').textContent).to.equal('Server has: Buy oat milk'));
    await click('Note 2');
    expect($('.server').textContent).to.equal('Server has: Call Sam');
  });

  const text = selector => $(selector).textContent;
  const texts = selector => $$(selector).map(el => el.textContent);
  const labelled = label => $(`[aria-label="${label}"]`);
  const press = async label => { labelled(label).click(); await frame(); };
  const submit = async form => { form.dispatchEvent(new Event('submit', { cancelable: true })); await frame(); };
  const key = async (target, init) => { target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })); await frame(); };

  it('groups the sidebar by stage, and every file of every scenario highlights without losing text', async function () {
    this.timeout(30000);
    expect(Array.from(host.querySelectorAll('nav h3'), el => el.textContent)).to.deep.equal(
      ['Basics', 'State', 'Forms and data', 'Lifecycle', 'Building blocks', 'Interaction and time', 'Async and sync', 'Whole apps']);
    for (const s of scenarios) {
      await go(s.id);
      await click('Code', host);
      for (const [i, f] of s.files.entries()) {
        if (i) await click(f.name, host.querySelector('.files'));
        const code = host.querySelector('pre code');
        expect(code.textContent, s.id + '/' + f.name).to.equal(f.source);
        // A stray apostrophe or slash would make a string or comment swallow markup or code.
        for (const el of code.querySelectorAll('.tok-string')) expect(el.textContent, s.id + '/' + f.name).to.not.match(/<\/|=>|\n.*\n/);
      }
    }
  });

  it('hello, props, children and lists show what they describe', async () => {
    await go('hello');
    expect(texts('p')).to.deep.equal(['Hello from kyvo.', 'Two plus two is 4.']);
    await go('props');
    expect(texts('p')).to.deep.equal(['Hello, Ada.', 'Hello, Hello, Grace.', 'Hello, Alan!']);
    await go('children');
    expect(texts('h3')).to.deep.equal(['Text', 'A list']);
    expect(texts('li')).to.deep.equal(['One', 'Two']);
    await go('lists');
    expect(texts('li')[2]).to.equal('Earth: 1 moons');
  });

  it('events: click, key and a link that stays put', async () => {
    await go('events');
    await click('Click me');
    expect(text('.last')).to.equal('Button clicked');
    await key($('input'), { key: 'q' });
    expect(text('.last')).to.equal('Key: q');
    $('a').click();
    await frame();
    expect(location.hash).to.equal('#/events');
    expect(text('.last')).to.equal('Link clicked, but we stayed here');
  });

  it('show and hide: both forms of conditional', async () => {
    await go('conditional');
    expect(text('.who')).to.equal('Please sign in.');
    expect($('.unread')).to.equal(null);
    await click('Sign in');
    await click('New message');
    expect([text('.who'), text('.unread')]).to.deep.equal(['Welcome back.', '1 unread']);
  });

  it('text input: follows typing and clears', async () => {
    await go('text-input');
    await type($('input'), 'Robin');
    expect(text('.greeting')).to.equal('Hello, Robin');
    await click('Clear');
    expect([$('input').value, text('.greeting')]).to.deep.equal(['', 'Who are you?']);
  });

  it('tabs: a conditional panel in the middle does not disturb its neighbours', async () => {
    await go('tabs');
    labelled('Nickname').value = 'Rob';
    await click('Help');
    await click('Shipping');
    $('input[type=checkbox]').click();                 // adds the Admin panel between the two
    await frame();
    expect(labelled('Nickname').value).to.equal('Rob');
    expect(texts('.section .body')).to.deep.equal(['Ships in two days.']);
  });

  it('tabs: panels keep what was typed, sections open, and the conditional tab comes and goes', async () => {
    await go('tabs');
    labelled('Nickname').value = 'Rob';
    await click('Help');
    await click('Shipping');
    expect(texts('.section .body')).to.deep.equal(['Ships in two days.']);
    await click('Profile');
    expect(labelled('Nickname').value).to.equal('Rob');
    expect(button('Admin')).to.equal(undefined);
    $('input[type=checkbox]').click();
    await frame();
    await click('Admin');
    expect($$('.panel').filter(p => !p.hidden).map(p => p.textContent)).to.deep.equal(['Secret settings.']);
  });

  it('sign-up: validates, blocks a double submit, shows a server error, then succeeds', async () => {
    await go('signup');
    await submit($('form'));
    expect(texts('.error')).to.deep.equal(['At least 3 characters', 'Needs an @', 'At least 8 characters']);
    await type($('input[name=name]'), 'taken');
    await type($('input[name=email]'), 'a@b.c');
    await type($('input[name=password]'), 'longenough');
    expect($$('.error').length).to.equal(0);
    // Submitting before the next frame must still be validated against what is in the fields now.
    $('input[name=name]').value = 'x';
    $('input[name=name]').dispatchEvent(new Event('input'));
    await submit($('form'));
    expect(button('Create account').disabled).to.equal(false);
    await type($('input[name=name]'), 'taken');
    await submit($('form'));
    expect(button('Creating…').disabled).to.equal(true);
    await until(() => expect(text('[role=alert]')).to.equal('That name is taken'));
    await type($('input[name=name]'), 'robin');
    await submit($('form'));
    await until(() => expect(text('.done')).to.equal('Welcome, robin.'));
  });

  it('table: pages, sorts, filters and selects', async () => {
    await go('table');
    const names = () => $$('tbody tr').map(tr => tr.children[1].textContent);
    expect(names().length).to.equal(8);
    labelled('Select ' + names()[0]).click();
    await frame();
    expect(labelled('Select page').indeterminate).to.equal(true);
    await press('Select page');
    expect(text('.summary')).to.equal('Page 1 of 3. 24 people, 8 selected.');
    await click('Next');
    await click('Next');
    expect(labelled('Select page').checked).to.equal(false);
    await type(labelled('Filter'), 'grace');
    expect(text('.summary')).to.equal('Page 1 of 1. 4 people, 8 selected.');
    expect(names().every(n => n.startsWith('Grace'))).to.equal(true);
    const scores = () => $$('tbody tr').map(tr => Number(tr.children[3].textContent));
    await click('Score');
    expect(scores()).to.deep.equal(scores().slice().sort((a, b) => a - b));
    await click('Score ↑');
    expect(scores()).to.deep.equal(scores().slice().sort((a, b) => b - a));
  });

  it('undo: buttons and keys walk the history', async () => {
    await go('undo');
    const on = () => $$('.pixels [aria-pressed=true]').map(b => b.getAttribute('aria-label'));
    await press('Cell 1');
    await press('Cell 2');
    await click('Undo');
    expect(on()).to.deep.equal(['Cell 1']);
    await click('Redo');
    expect(on()).to.deep.equal(['Cell 1', 'Cell 2']);
    await key(document.body, { key: 'z', ctrlKey: true });
    await key(document.body, { key: 'z', metaKey: true });
    expect(on()).to.deep.equal([]);
    await key(document.body, { key: 'Z', ctrlKey: true, shiftKey: true });
    expect(on()).to.deep.equal(['Cell 1']);
    expect(text('.steps')).to.equal('1 steps back, 1 forward');
  });

  it('reorder: arrows and drops move the row with its note and focus', async () => {
    await go('reorder');
    const order = () => texts('.reorder .title');
    const note = labelled('Note for Build');
    note.value = 'soon';
    note.focus();
    await press('Move Build up');
    expect(order()).to.deep.equal(['Build', 'Design', 'Test', 'Ship']);
    expect(labelled('Note for Build')).to.equal(note);
    expect(note.value).to.equal('soon');
    if (Element.prototype.moveBefore) expect(document.activeElement).to.equal(note);
    const row = name => $$('.reorder li').find(li => li.querySelector('.title').textContent === name);
    row('Ship').dispatchEvent(new Event('dragstart', { bubbles: true }));
    row('Build').dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    await frame();
    expect(order()).to.deep.equal(['Ship', 'Build', 'Design', 'Test']);
  });

  it('chart: draws, pauses, and keeps its points when the feed changes', async () => {
    await go('profile');
    clock = sinon.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    await go('chart');
    const count = () => $('polyline').getAttribute('points').split(' ').filter(Boolean).length;
    clock.tick(600);
    await frame();
    expect(count()).to.equal(3);
    await click('Pause');
    clock.tick(1000);
    await frame();
    expect(count()).to.equal(3);
    await click('Resume');
    await type(labelled('Feed'), 'steps', 'change');
    clock.tick(200);
    await frame();
    expect(count()).to.equal(4);
    expect(text('.reading')).to.equal('Latest: 20');
    await go('counter');
    expect(clock.countTimers ? clock.countTimers() : Object.keys(clock.timers || {}).length).to.equal(0);
  });

  it('favorites: saves, rolls back a failure, and a newer click wins over an older failure', async () => {
    await go('favorites');
    await click('☆ Dune');
    expect(text('.server')).to.equal('Server has: nothing');
    await until(() => expect(text('.server')).to.equal('Server has: Dune'));
    $('input[type=checkbox]').click();
    await frame();
    await click('☆ Emma');
    expect(button('★ Emma')).to.exist;
    await until(() => expect(text('[role=alert]')).to.include('Emma'));
    expect(button('☆ Emma')).to.exist;
    // Two quick clicks that both fail end where the server is.
    await click('★ Dune');
    await click('☆ Dune');
    await sleep(600);
    expect(button('★ Dune')).to.exist;
    expect(JSON.parse(localStorage.getItem('gallery:favorites'))).to.deep.equal(['Dune']);
    localStorage.removeItem('gallery:favorites');
  });

  it('chat: one connection per room, drafts kept, newest message scrolled into view', async () => {
    await go('chat');
    await until(() => expect(texts('.messages li')).to.deep.equal(['Welcome to #general']));
    // The specs do not load styles.css, which is what gives the list its fixed height.
    $('.messages').style.cssText = 'height: 100px; overflow: auto';
    await type(labelled('Message'), 'half typed');
    await click('#random');
    expect(labelled('Message').value).to.equal('');
    await click('#general');
    expect(labelled('Message').value).to.equal('half typed');
    // #random was left before its greeting arrived, so its connection was closed in time.
    await sleep(250);
    await click('#random');
    expect(texts('.messages li')).to.deep.equal([]);
    await until(() => expect(texts('.messages li')).to.deep.equal(['Welcome to #random']));
    for (let i = 0; i < 8; i++) {
      await type(labelled('Message'), 'line ' + i);
      await submit($('form'));
    }
    await until(() => expect(texts('.messages li')).to.include('echo: line 7'));
    await frame();
    const list = $('.messages');
    expect(list.scrollHeight).to.be.above(list.clientHeight);
    expect(Math.abs(list.scrollHeight - list.clientHeight - list.scrollTop)).to.be.below(2);
  });

  it('mail: routes by address, marks read, steps with j and k, and empties the reply box', async () => {
    await go('mail');
    expect($('.empty')).to.exist;
    $('.inbox a').click();
    await until(() => expect(text('.message h3')).to.equal('Engine notes'));
    expect(location.hash).to.equal('#/mail/1');
    expect(host.querySelector('h1').textContent).to.equal('Mail reader');
    await type(labelled('Reply'), 'thanks');
    await key(labelled('Reply'), { key: 'j' });
    expect(location.hash).to.equal('#/mail/1');
    await key(document.body, { key: 'j' });
    await until(() => expect(text('.message h3')).to.equal('A bug'));
    expect(labelled('Reply').value).to.equal('');
    await key(document.body, { key: 'k' });
    await until(() => expect(text('.message h3')).to.equal('Engine notes'));
    await type(labelled('Reply'), 'ok');
    await submit($('form'));
    expect(text('.sent')).to.equal('Reply sent.');
    await click('Unread');
    expect($$('.inbox li').length).to.equal(2);          // the one still unread, and the open one
    history.back();
    await until(() => expect(location.hash).to.not.equal('#/mail/1'));
    await click('Close');
    await until(() => expect($('.empty')).to.exist);
    // Arriving with a message already in the address opens it.
    await go('counter');
    await go('mail/3');
    await until(() => expect(text('.message h3')).to.equal('Chess'));
  });

  it('kanban: adds, moves, drags, edits, searches, saves and loads its settings lazily', async () => {
    localStorage.removeItem('gallery:kanban');
    await go('kanban');
    const column = name => $(`section[aria-label="${name}"]`);
    const titles = name => Array.from(column(name).querySelectorAll('.title'), el => el.textContent);
    await type(labelled('New card'), 'Tidy up');
    await submit($('.kanban form'));
    expect(titles('To do')).to.include('Tidy up');
    await press('Move Tidy up right');
    expect(titles('Doing')).to.deep.equal(['Add examples', 'Tidy up']);
    column('To do').querySelector('li').dispatchEvent(new Event('dragstart', { bubbles: true }));
    column('Done').dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    await frame();
    expect(titles('Done')).to.deep.equal(['Write the docs']);
    await press('Edit Ship it');
    expect(document.activeElement).to.equal(labelled('Title'));
    await type(labelled('Title'), 'discarded');
    await key(labelled('Title'), { key: 'Escape' });
    expect($('[role=dialog]')).to.equal(null);
    expect(titles('To do')).to.deep.equal(['Ship it']);
    await press('Edit Ship it');
    await type(labelled('Title'), 'Ship it today');
    await submit($('[role=dialog]'));
    expect(titles('To do')).to.deep.equal(['Ship it today']);
    await type(labelled('Search cards'), 'ship');
    await until(() => expect($$('.column li').length).to.equal(1));
    expect(JSON.parse(localStorage.getItem('gallery:kanban')).cards.map(c => c.title)).to.include('Ship it today');
    await click('Settings');
    await until(() => expect($('.settings')).to.exist);
    $('.settings input').click();
    await frame();
    expect($('.kanban').classList.contains('compact')).to.equal(true);
    expect(JSON.parse(localStorage.getItem('gallery:kanban')).compact).to.equal(true);
    await click('Reset board');
    await type(labelled('Search cards'), '');
    await until(() => expect($$('.column li').length).to.equal(3));
    localStorage.removeItem('gallery:kanban');
  });
});
