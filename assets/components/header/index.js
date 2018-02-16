import { h, Component } from 'preact';
import { Link } from 'preact-router/match';
import fire from '../../js/fire';

export default class Header extends Component {
	render({loggedIn}) {
		if(!loggedIn) return '';
		return (
			<header class="pure-menu pure-menu-horizontal">
				<input oninput={fire('filterByText')}/>
				<ul class="pure-menu-list">
					<li class="pure-menu-item"><Link activeClassName="active" href="/entries" class="pure-menu-link">Entries</Link></li>
					<li class="pure-menu-item"><Link activeClassName="active" href="/entry/new" class="pure-menu-link">Create</Link></li>
					<li class="pure-menu-item"><Link activeClassName="active" href="#" onClick={fire('logout')} class="pure-menu-link">Logout</Link></li>
				</ul>
			</header>
		);
	}
}
