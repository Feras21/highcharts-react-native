import React from 'react';
import { StyleSheet, View, Button } from 'react-native';
import HighchartsReactNative from './dist';

const modules = [
  'solid-gauge'
];

export default class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      chartOptions: this.props.options || {
        chart: {
          type: 'column',
        },
        title: {
          text: 'Chart Title',
        },
        series: [
          {
            data: [1, 3, 2],
          },
        ],
      },
    };
  }

  render() {
    return (
      <View style={styles.container}>
        <HighchartsReactNative
          useCDN={true}
          styles={styles.container}
          options={this.state.chartOptions}
          devPath={'192.168.0.1:12345'}
          useSSL={true}
          modules={modules}
          onMessage={message => {
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
