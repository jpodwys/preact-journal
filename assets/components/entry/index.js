import { h, Component } from 'preact';
import fire from '../../js/fire';
import FourOhFour from '../four-oh-four';

export default class Entry extends Component {
  shouldComponentUpdate(nextProps, nextState) {
    var oe = this.props.entry;
    var ne = nextProps.entry;
    if(!oe || !ne) return true;
    if(ne.date === oe.date
      && ne.text === oe.text.trim()
      && ne.isPublic === oe.isPublic) return false;
    return true;
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

  render({ entryIndex, entry, entryReady }) {
    if(!entryReady) return;
    if(!entry) return <FourOhFour/>
    return (
      <entry-view>
        <h1 contenteditable onInput={this.update}>
          {entry.date}
        </h1>
        <span>{ this.getIcons(entry) }</span>✖
        <pre contenteditable onInput={this.update} class="entry-text">{entry.text}</pre>
      </entry-view>
    );
  }
}
