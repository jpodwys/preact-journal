import Media from '../services/media-service';
import { findObjectIndexById, isActiveEntryId } from '../utils';

const FILE_INPUT = () => document.getElementById('file-input');

function showFileSelector (){
  FILE_INPUT().click();
}

function uploadFile (el, { entryId, file }){
  if(!entryId || !file) return;
  const entryIndex = findObjectIndexById(entryId, el.state.entries);
  if(entryIndex === -1) return;
  const entry = el.state.entries[entryIndex];

  const reader = new FileReader();
  reader.onload = (e) => {
    el.set({
      entry: Object.assign({}, entry, { imagePreview: e.target.result }),
      entries: [].concat(el.state.entries)
    });
  }
  reader.readAsDataURL(file);

  // Media.uploadFile(file)
  //   .then((url) => imploadImageSuccess(el, entryId, url))
  //   .catch(err => imploadImageFailure(el, err));
}

function imploadFileSuccess (el, entryId, url){
  const entryIndex = findObjectIndexById(entryId, el.state.entries);
  const entry = el.state.entries[entryIndex];
  delete entry.imagePreview;
  entry.imageUrl = url;
  const entries = [].concat(el.state.entries);

  /**
   * Only update state.entry if the entry we just
   * modified is still active.
   */
  const activeEntry = isActiveEntryId(el, entry.id)
    ? Object.assign({}, entry)
    : el.state.entry;

  el.set({ entry: activeEntry, entries });
};

function imploadFileFailure (el, err){
  console.log('imploadImageFailure', err);
};

export default { showFileSelector, uploadFile };
