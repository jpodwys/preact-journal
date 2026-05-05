import { h } from 'preact';
import { mount } from '../../../test/mount';
import ZeroState from './index';

describe('zero-state', () => {
  let env;
  afterEach(() => { if(env) env.cleanup(); env = null; });

  it('renders the empty-state heading into the DOM', () => {
    env = mount(h(ZeroState, null));
    const heading = env.getByRole('heading');
    expect(heading.textContent).to.equal("It's empty in here!");
    expect(env.getByText("It's empty in here!")).to.equal(heading);
  });
});
