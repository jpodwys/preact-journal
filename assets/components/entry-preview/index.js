import { h, Component } from 'preact';

export default class EntryPreview extends Component {
  render({ entry }) {
    return (
      <div style="height:90px;overflow:hidden;padding:10px 0;">
        <a href={"/entry/" + entry.id}>{entry.date}</a>
        <div style="width: calc(100% - 15px);float: right;">{entry.text.substr(0, 140)}</div>
      </div>
    );
  }
}
