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
    history.replaceState(null, '', '#/');
    sync();
    nav.tab = 'demo';
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

  it('links every scenario, and each page shows its demo, its footgun and exactly its source', async () => {
    expect(host.querySelectorAll('nav a').length).to.equal(scenarios.length);
    for (const s of scenarios) {
      await go(s.id);
      expect(host.querySelector('h1').textContent, s.id).to.equal(s.title);
      expect(host.querySelector('.footgun').textContent).to.include(s.footgun);
      expect(demo().children.length, s.id).to.be.above(0);
      expect(host.querySelector('pre').textContent).to.equal(s.source);
      expect(s.source).to.include("from 'kyvo/core'");
      expect(s.source).to.include('export default');
      expect(host.querySelector('nav a[aria-current]').getAttribute('href')).to.equal('#/' + s.id);
    }
  });

  it('keeps the demo state while the Code tab is open', async () => {
    await click('Clicked 0 times');
    const element = $('button');
    await click('Code', host);
    expect(demo().hidden).to.equal(true);
    expect(host.querySelector('pre').hidden).to.equal(false);
    await click('Demo', host);
    expect(demo().hidden).to.equal(false);
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

  it('profile: loads, ignores a late answer, and shows an error', async () => {
    await go('profile');
    expect($('.result').textContent).to.equal('Loading…');
    await click('User 2');
    await until(() => expect($('.result').textContent).to.equal('Grace'));
    await click('User 3');
    await until(() => expect($('[role=alert]').textContent).to.equal('No such user'));
    await click('User 1');
    await click('User 2');
    await sleep(500);
    expect($('.result').textContent).to.equal('Grace');
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
});
