import { h, Component } from 'preact';
import Icon from '../icon';
import fire from '../../js/fire';
import Transition from '../transition';
import FourOhFour from '../four-oh-four';
import debounce from '../../js/debounce';

export default class Entry extends Component {
  componentDidUpdate() {
    if(this.props.view === '/new'){
      let entryText = this.base.querySelector('#entryText');
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
      entry.date = this.base.querySelector('#entryDate').innerText;
      entry.text = this.base.querySelector('#entryText').innerText;

      fire('createEntry', {entry: entry})();
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
      property: property,
      entryId: this.props.entry.id,
      entry: {}
    }
    obj.entry[property] = e.target.innerText;

    fire('updateEntry', obj)();
  }

  render({ view, entries, entry, entryIndex, entryReady }) {
    if(!entry) return <FourOhFour/>
    return (
      <Transition className="reveal" inlineStyle>
        <div class="entry">
          <div class="entry-header nav-set dark-fill">

            <Icon
              icon="left"
              onclick={fire('shiftEntry', -1)}
              class={entryIndex > 0 ? 'dark-fill' : 'dark-fill hidden'}/>

            <h1
              id="entryDate"
              contenteditable
              onInput={this.upsert}
              class="entry-date center-text">
              {entry.date}
            </h1>

            <Icon
              icon="right"
              onclick={fire('shiftEntry', 1)}
              class={entryIndex < (entries.length - 1) ? 'dark-fill' : 'dark-fill hidden'}/>

          </div>
          <div id="entryText" contenteditable onInput={this.upsert} class="entry-text">{entry.text}</div>
        </div>
      </Transition>
    );
  }
}
