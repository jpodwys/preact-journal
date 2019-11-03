import Media from '../services/media-service';
import { findObjectIndexById, isActiveEntryId } from '../utils';

const FILE_INPUT = () => document.getElementById('file-input');

function showFileSelector (){
  FILE_INPUT().click();
}

function uploadImage (el, { entry, file }){
  if(!entry || !file) return;
  const entryIndex = findObjectIndexById(entry.id, el.state.entries);
  if(entryIndex === -1) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    entry.imagePreview = e.target.result;
    el.set({
      entry: Object.assign({}, entry),
      entries: [].concat(el.state.entries)
    });
  }
  reader.readAsDataURL(file);

  // Media.uploadImage(file)
  //   .then((url) => imploadImageSuccess(el, entry, url))
  //   .catch(err => imploadImageFailure(el, err));
}

function imploadImageSuccess (el, entry, url){
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

function imploadImageFailure (el, err){
  console.log('imploadImageFailure', err);
};

export default { showFileSelector, uploadImage };
