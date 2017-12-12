import { h, Component } from 'preact';
// import VirtualList from 'preact-virtual-list';
import linkState from 'linkstate';
import fire from '../../js/fire';

export default class Entries extends Component {
  componentWillMount = () => {
    fire('getForUser')();
  };

  renderRow(row) {
    return <h1>{row.text}</h1>
  }

  render(props) {
    return (
      <div>
        <ul>
          { props.entries.map( entry => ( <li><h1>{entry.text}</h1></li> )) }
        </ul>

        {/*<VirtualList data={props.entries} rowHeight={30} renderRow={this.renderRow} />*/}
      </div>
    );
  }
}
