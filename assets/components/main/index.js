import { h, Component } from 'preact';
import fire from '../../assets/js/fire';
import Item from '../item';

const Main = ({ children, ...props }) => (
  <main>
    <div style="height: 25px;">
      {props.loading ? 'loading' : ''}
    </div>
    <button onClick={fire('addItem')}>Add</button>
    <ul>
      { props.items.map( item => ( <li><Item item={item}/></li> )) }
    </ul>
  </main>
);

export default Main;
