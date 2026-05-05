import { h } from 'preact';
import { mount } from '../../../test/mount';
import FourOhFour from './index';

describe('four-oh-four', () => {
  let env;
  afterEach(() => { if(env) env.cleanup(); env = null; });

  it('renders the not-found heading', () => {
    env = mount(h(FourOhFour, null));
    const heading = env.getByRole('heading');
    expect(heading.textContent).to.equal("Looks like that doesn't exist!");
  });
});
