import { Route, Router } from '@solidjs/router'
import { render } from 'solid-js/web'
import Home from './home'
import App from './layout'
import NotFound from './not-found'
import Settings from './settings'

render(
  () => (
    <Router root={App}>
      <Route path="/" component={Home} />
      <Route path="/settings" component={Settings} />
      <Route path="*404" component={NotFound} />
    </Router>
  ),
  document.getElementById('root') as HTMLElement
)
