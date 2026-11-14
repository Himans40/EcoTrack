import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// Works seamlessly across Expo Go, iOS, Android, and Web
registerRootComponent(App);
