import { h, Component } from 'preact';
import Main from '../main'

export default class Home extends Component {
  render(props) {
    return (
      <div>
        <h1>Home</h1>
        <p>This is the Home component.</p>
        <Main { ...props }/>
      </div>
    );
  }
}
