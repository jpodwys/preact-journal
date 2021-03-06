import { h, Component } from 'preact';
import Icon from '../icon';
import { fire } from '../unifire';
import FourOhFour from '../four-oh-four';
import debounce from '../../js/debounce';

export default class Entry extends Component {
  componentDidUpdate() {
    if(this.props.view === '/new'){
      let entryText = document.getElementById('entryText');
      if(entryText) entryText.focus();
    }
  }

  shouldComponentUpdate(nextProps) {
    var oe = this.props.entry;
    var ne = nextProps.entry;
    if(!oe || !ne) return true;
    if(oe.id !== ne.id) return true;
    return false;
  }

  slowUpsert = e => {
    var entry = this.props.entry;
    if(entry.newEntry){
      entry.date = document.getElementById('entryDate').innerText;
      entry.text = document.getElementById('entryText').innerText;
      fire('createEntry', { entry });
    } else {
      this.update(e);
    }
  }

  upsert = debounce(this.slowUpsert, 500);

  update = e => {
    var property;
    switch(e.target.id){
      case 'entryDate':  property = 'date'; break;
      case 'entryText':  property = 'text'; break;
    }
    var obj = {
      entry: {},
      property: property,
      entryId: this.props.entry.id
    }
    obj.entry[property] = e.target.innerText.trim();
    fire('updateEntry', obj);
  }

  render({ view, entry, viewEntries, entryIndex }) {
    if(!entry) return <FourOhFour/>
    return (
      <div class="entry fade-up">
        <div class="entry-header nav-set dark-fill">
          {view !== '/new' &&
            <Icon
              icon="left"
              key={entry.id + '-left'}
              onclick={() => fire('shiftEntry', -1)}
              class={entryIndex > 0 ? 'dark-fill' : 'hidden'}/>
          }
          <div class="entry-date-wrapper">
            <h1
              id="entryDate"
              contenteditable
              onInput={this.upsert}
              class="entry-date center-text">
              {entry.date}
            </h1>
          </div>
          {view !== '/new' &&
            <Icon
              icon="left"
              key={entry.id + '-right'}
              onclick={() => fire('shiftEntry', 1)}
              class={entryIndex < (viewEntries.length - 1) ? 'dark-fill rotate180' : 'hidden'}/>
          }
        </div>
        <div
          id="entryText"
          contenteditable
          class="entry-text"
          onInput={this.upsert}
          key={'entry-' + entry.id}>
          {entry.text}
        </div>
      </div>
    );
  }
}
