import Global from './global-actions';
// import Router from './router-actions';
import User from './user-actions';
import Entry from './entry-actions';

export default Object.assign(Global, /*Router,*/ User, Entry);
