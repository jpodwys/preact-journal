import { h, Component } from 'preact';
import linkState from 'linkstate';
import fire from '../../js/fire';

export default class Entries extends Component {
  componentWillMount = () => {
    fire('getForUser')();
  };

  render(props) {
    return (
      <ul>
        { props.entries.map( entry => ( <li><h1>{entry.text}</h1></li> )) }
      </ul>
    );
  }
}
