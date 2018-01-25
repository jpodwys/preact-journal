import { h, Component } from 'preact';
import fire from '../../js/fire';

export default class Entry extends Component {
  // componentDidMount() {
  //   this.interval = setInterval(() => {
  //     if(entryHasChanged()){
  //       this.upsert({isBackgroundUpsert: true});
  //     }
  //   }, 5000);
  // }

  // componentWillUnmount() {
  //   clearInterval(this.interval);
  // }

  getDate() {
    return new Date().toISOString().slice(0, 10);
  }

  upsert = e => {
    e.preventDefault();

    var entry = {
      date: this.base.querySelector('[name="date"]').innerText,
      text: this.base.querySelector('[name="text"]').innerText,
      isPublic: this.base.querySelector('[name="isPublic"]').checked,
    };
    fire('createEntry', {entry: entry})();
  }

  render({ entryIndex, entry }) {
    return (
      <new-entry>
        <form class="pure-form pure-form-stacked">
          <fieldset>
            <input name="date" onInput={this.upsert} value={this.getDate()} class="needsclick"/>
            <textarea name="text" onInput={this.upsert} class="entry-text needsclick"></textarea>
            Is Public: <input onInput={this.upsert} type="checkbox" name="isPublic" checked="{opts.entry.isPublic}"/>
            <div class="entry-actions">
              <a href="/entries" onclick="{back}" class="pure-button button-round entry-action--left">Cancel</a>
              <input type="submit" class="pure-button pure-button-primary button-round entry-action--right"/>
            </div>
          </fieldset>
        </form>
      </new-entry>
    );
  }
}
