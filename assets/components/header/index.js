import { h, Component } from 'preact';
import { Link } from 'preact-router/match';
import fire from '../../js/fire';
import { preventDefault } from '../../js/utils';

export default class Header extends Component {
	render({loggedIn, filterText, showFilterInput}) {
		if(!loggedIn) return '';
		return (
			<header>
				<span class="nav-set">
					<svg fill="#FFF" height="24" width="24" xmlns="http://www.w3.org/2000/svg">
					  <path d="M0 0h24v24H0z" fill="none"/>
					  <path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20v-2z"/>
					</svg>
				</span>

				<span class="nav-set grow">
					{showFilterInput &&
						<form class="search-form full-height right" onsubmit={preventDefault}>
					    <input
					    	value={filterText}
					    	autofocus
					    	placeholder="Search Entries"
					    	oninput={fire('filterByText')}
					    	onblur={fire('blurTextFilter')}
					    />
					  </form>
					}
				</span>

				<span class="nav-set">
					{showFilterInput &&
				  	<svg fill="#FFF" height="24" width="24" xmlns="http://www.w3.org/2000/svg" onclick={fire('filterByText', {value: ''})}>
						  <path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4l5.6 5.6L5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6z"/>
						  <path d="M0 0h24v24H0z" fill="none"/>
						</svg>
				  }
				  {!showFilterInput &&
				  	<svg fill="#FFF" height="24" width="24" xmlns="http://www.w3.org/2000/svg" onclick={fire('linkstate', {key: 'showFilterInput', val: true})}>
						  <path d="M15.5 14h-.8l-.3-.3c1-1.1 1.6-2.6 1.6-4.2a6.5 6.5 0 1 0-2.3 5l.3.2v.8l5 5 1.5-1.5-5-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/>
						  <path d="M0 0h24v24H0z" fill="none"/>
						</svg>
				  }
					<svg fill="#FFF" height="24" width="24" xmlns="http://www.w3.org/2000/svg">
					  <path d="M0 0h24v24H0z" fill="none"/>
					  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
					</svg>
				</span>
			</header>
		);
	}
}
