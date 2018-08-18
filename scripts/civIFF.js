class Form extends React.Component {
  constructor(props) {
    super(props)
    this.state = {value: ''}
  }

  handleChange(e) {
    this.setState({value: e.target.value})
    console.log('State updated to ', e.target.value);
  }

  render() {
    return (
      <div>
        <input
          id='textfield'
          value={this.state.value}
          onChange={this.handleChange.bind(this)}
        />
        <p>{this.state.value}</p>
      </div>
    )
  }
}

ReactDOM.render(
  <Form />,
  document.getElementById('app')
)

document.getElementById('textfield').value = 'foo'
const event = new Event('input', { bubbles: true })
document.getElementById('textfield').dispatchEvent(event)
