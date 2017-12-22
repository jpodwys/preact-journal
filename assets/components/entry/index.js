import { h, Component } from 'preact';
import linkState from 'linkstate';
import fire from '../../js/fire';
import FourOhFour from '../four-oh-four';

export default class Entry extends Component {
  componentWillMount() {
    if(this.props.id) fire('setEntry', {id: this.props.id})();
  }

  getIcons(entry) {
    // if(!entry.isOwner) return '';
    return !entry.isPublic ? '🔐' : '🔓'
  }

  getEntry(entry) {
    return {
      id: entry.id,

    }
  }

  update = e => {
    var property;
    switch(e.target.nodeName){
      case 'H1':  property = 'date'; break;
      case 'PRE': property = 'text'; break;
    }

    var obj = {
      entryIndex: this.props.entryIndex,
      property: property,
      entry: {
        id: this.props.entry.id
      }
    }
    obj.entry[property] = e.target.innerText;

    fire('update', obj)();
  }

  render({ entryIndex, entry }) {
    if(!entry) return <FourOhFour/>
    return (
      <entry-view>
        <h1 contenteditable onInput={this.update}>
          {entry.date}
        </h1>
        <span>{ this.getIcons(entry) }</span>✖
        <pre contenteditable onInput={this.update} class="entry-text">{entry.text}</pre>
        {/*  <pre contenteditable onInput={fire('update', {id: entry.id, entryIndex: entryIndex, text: })} class="entry-text">{entry.text}</pre> */}
        {/* <pre contenteditable onInput={linkState(app, 'entries.' + entryIndex + '.text', 'target.innerText')} class="entry-text">{entry.text}</pre> */}
      </entry-view>
    );
  }
}
