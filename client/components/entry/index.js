import { h, Component } from 'preact';
import Icon from '../icon';
import { fire } from '../unifire';
import debounce from '../../js/debounce';

export default class Entry extends Component {
  componentDidUpdate() {
    if(this.props.view === '/new'){
      let et = document.getElementById('et');
      if(et) et.focus();
    }
  }

  shouldComponentUpdate({ entry: ne }) {
    const oe = this.props.entry;
    return !oe || !ne || oe.id !== ne.id;
  }

  slowUpsert = e => {
    var entry = this.props.entry;
    if(entry.newEntry){
      entry.date = document.getElementById('ed').innerText;
      entry.text = document.getElementById('et').innerText;
      fire('createEntry', { entry });
    } else {
      this.update(e);
    }
  }

  upsert = debounce(this.slowUpsert, 500);

  update = e => {
    const property = e.target.id === 'ed' ? 'date' : 'text';
    fire('updateEntry', {
      entry: { [property]: e.target.innerText.trim() },
      property,
      entryId: this.props.entry.id
    });
  }

  render({ view, entry, viewEntries, entryIndex }) {
    if(!entry) return <h2 class="center-text fade-up">Looks like that doesn't exist!</h2>
    return (
      <div class="fade-up">
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
              id="ed"
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
          id="et"
          contenteditable="plaintext-only"
          class="entry-text"
          onInput={this.upsert}
          key={'entry-' + entry.id}>
          {entry.text}
        </div>
      </div>
    );
  }
}
