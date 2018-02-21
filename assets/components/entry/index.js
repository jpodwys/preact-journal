import { h, Component } from 'preact';
import fire from '../../js/fire';
import FourOhFour from '../four-oh-four';

export default class Entry extends Component {
  shouldComponentUpdate(nextProps, nextState) {
    var oe = this.props.entry;
    var ne = nextProps.entry;
    if(!oe || !ne) return true;
    if(oe.id !== ne.id) return true;
    return false;
    // if(ne.date === oe.date
    //   && ne.text === oe.text.trim()
    //   && ne.isPublic === oe.isPublic) return false;
    // return true;
  }

  // getIcons(entry) {
    // if(!entry.isOwner) return '';
    // return !entry.isPublic ? '🔐' : '🔓'
    // var isPublic = entry.isPublic ? 'Public' : 'Private';
    // return <span id="isPublic" data-val={entry.isPublic}>{isPublic}</span>
  // }

  upsert = e => {
    var entry = this.props.entry;

    if(entry.newEntry){
      entry.date = this.base.querySelector('#entryDate').innerText;
      entry.text = this.base.querySelector('#entryText').innerText;
      entry.isPublic = this.base.querySelector('#isPublic').checked;

      fire('createEntry', {
        entry: entry,
      })();
    } else {
      this.update(e);
    }
  }

  update = e => {
    var property;
    switch(e.target.id){
      case 'entryDate':  property = 'date'; break;
      case 'entryText':  property = 'text'; break;
    }

    var obj = {
      property: property,
      entryId: this.props.entry.id,
      entry: {}
    }
    obj.entry[property] = e.target.innerText;

    fire('updateEntry', obj)();
  }

  togglePublic = e => {
    var obj = {
      property: 'isPublic',
      entryId: this.props.entry.id,
      entry: {
        isPublic: this.base.querySelector('#isPublic').checked
      }
    }

    fire('updateEntry', obj)();
  }

  render({ entryIndex, entry, entryReady }) {
    if(!entryReady) return;
    if(!entry) return <FourOhFour/>
    return (
      <entry-view>
        <h1 id="entryDate" contenteditable onInput={this.upsert}>
          {entry.date}
        </h1>
        Public <input id="isPublic" type="checkbox" onClick={this.togglePublic} checked={entry.isPublic}/>
        <div id="entryText" contenteditable onInput={this.upsert} class="entry-text">{entry.text}</div>
      </entry-view>
    );
  }
}
