import { h, Component } from 'preact';
import { Link } from 'preact-router/match';
import fire from '../../js/fire';

export default class Header extends Component {
	render({loggedIn}) {
		if(!loggedIn) return '';
		return (
			<header class="pure-menu pure-menu-horizontal right">
			{/*
				<svg class="search-icon" width="40" height="40" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
				  <path fill-rule="evenodd" clip-rule="evenodd" d="M23.9 21.6a9 9 0 0 0-7.2-14.3c-5 0-9 4-9 9a9 9 0 0 0 13.1 8l8.5 8.5 2.8-2.8-8.2-8.4zm-7.1.9a6.2 6.2 0 0 1-6.2-6.2c0-3.4 2.8-6.2 6.2-6.2 3.4 0 6.2 2.8 6.2 6.2 0 3.4-2.8 6.2-6.2 6.2z"/>
				</svg>
			*/}
				<ul class="pure-menu-list left">
					<li class="pure-menu-item">
							<Link activeClassName="active" href="#" onClick={fire('logout')} class="pure-menu-link">
								<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" version="1" viewBox="0 0 16 16">
								  <path style="block-progression:tb;text-transform:none;text-indent:0" d="M8 0a1 1 0 0 0-1 1v6c0 .5.5 1 1 1s1-.5 1-1V1c0-.6-.5-1-1-1zM4.7 2.5h-.3c-3 1.7-4 4.9-3.1 7.6A7 7 0 0 0 8 15a7 7 0 0 0 6.7-4.8c.8-2.6 0-5.8-3.1-7.6a1 1 0 0 0-1.4.4c-.2.4 0 1 .4 1.3 2.4 1.4 2.9 3.5 2.3 5.4a5 5 0 0 1-5 3.4 5 5 0 0 1-4.8-3.6c-.6-2 0-4 2.2-5.2.4-.2.6-.7.4-1.1a1 1 0 0 0-1-.7z" color="#000"/>
								</svg>
							</Link>
						</li>
				</ul>

				<form class="pure-form search-input">
					<input oninput={fire('filterByText')}/>
				</form>
				
				<ul class="pure-menu-list right">
					<li class="pure-menu-item">
						<Link activeClassName="active" href="/entries" class="pure-menu-link">
							<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
							  <path d="M49.9 60.7a3 3 0 0 1-1.5-.4L6.5 36.5a3 3 0 0 1 0-5.2l42-25a3 3 0 0 1 3.1 0l42 24.6a3 3 0 0 1-.1 5.2L51.4 60.3a3 3 0 0 1-1.5.4zm-36-26.9l36 20.4L86 33.5 50.1 12.3 14 33.8z"/>
							  <path d="M49.9 77.4a3 3 0 0 1-1.5-.4L6.5 53.2a3 3 0 1 1 3-5.2l40.4 23 40.6-23.3a3 3 0 1 1 3 5.2L51.4 77a3 3 0 0 1-1.5.4z"/>
							  <path d="M49.9 94.2a3 3 0 0 1-1.5-.4L6.5 70a3 3 0 1 1 3-5.2l40.4 22.9 40.6-23.3a3 3 0 1 1 3 5.2L51.4 93.8a3 3 0 0 1-1.5.4z"/>
							</svg>
						</Link>
					</li>
					<li class="pure-menu-item">
						<Link activeClassName="active" href="/entry/new" class="pure-menu-link">
							<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
							  <path d="M89.5 45.9H54V10.5a4.1 4.1 0 0 0-8.2 0V46H10.5a4.1 4.1 0 0 0 0 8.2H46v35.4a4.1 4.1 0 0 0 8.2 0V54h35.4a4.1 4.1 0 0 0 0-8.2z"/>
							</svg>
						</Link>
					</li>
				</ul>
			</header>
		);
	}
}
