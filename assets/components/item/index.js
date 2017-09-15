import { h, Component } from 'preact';
import fire from '../../js/fire';

const Item = ({ children, ...props }) => (
  <item>
    { 'Item '+props.item }
    <button onClick={fire('removeItem', {item: props.item})}>Remove</button>
  </item>
);

export default Item;
