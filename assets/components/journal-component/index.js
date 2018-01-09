import { Component } from 'preact';
import fire from '../../js/fire';
import query from '../../js/query-selector';

export default class JournalComponent extends Component {
  componentWillMount() {
    this.fire = fire;
  }

  componentDidMount() {
    this.q = query(this);
  }
}
