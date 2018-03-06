import { h, Component } from 'preact';
import fire from '../../js/fire';
import FourOhFour from '../four-oh-four';
import debounce from '../../js/debounce';

export default class Entry extends Component {
  componentDidUpdate() {
    if(this.props.view === '/new'){
      let entryText = this.base.querySelector('#entryText');
      if(entryText) entryText.focus();
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    var oe = this.props.entry;
    var ne = nextProps.entry;
    if(!oe || !ne) return true;
    if(oe.id !== ne.id) return true;
    return false;
  }

  // componentDidMount() {
  //   setTimeout(function(){
  //     this.base.classList.remove('hidden');
  //   }.bind(this), 1000)
  // }

  // componentWillUnmount() {
  //   this.base.classList.add('hidden');
  // }

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

  render({ view, entryIndex, entry, entryReady }) {
    if(view !== '/new' && !entryReady) return;
    if(!entry) return <FourOhFour/>
    return (
      <entry-view class="hidden">
        <h1 id="entryDate" contenteditable onInput={this.upsert} class="entry-date center-text">
          {entry.date}
        </h1>
        <div id="entryText" contenteditable onInput={this.upsert} class="entry-text">{entry.text}</div>
      </entry-view>
    );
  }
}
