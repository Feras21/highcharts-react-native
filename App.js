import React from 'react';
import { StyleSheet, View } from 'react-native';
import HighchartsReactNative from './dist';

const modules = [
  'solid-gauge'
];

export default class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      chartOptions: JSON.stringify(this.props.options)
    };

  }

componentDidUpdate(prevProps){
    if(prevProps.options !== this.props.options){
      this.setState({
        chartOptions: JSON.stringify(this.props.options)
      }); 
    }
}
  render() {
    return (
      <View style={styles.container}>
        <HighchartsReactNative
          useCDN={true}
          styles={styles.container}
          options={ JSON.parse(this.state.chartOptions)}
          devPath={'192.168.0.1:12345'}
          useSSL={true}
          modules={modules}
          onMessage={message => {
            console.log(message);
            this.props.onMessage(message)
          }}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    flex: 1,
    width: '100%',
  },
  button: {
    justifyContent: 'center',
  },
});
