export default class CheckboxBlock extends Block {
  static observedAttributes = ["checked"];
  
  tagName = "checkbox-block";

  render = `
    <input
    	type="checkbox"
    />
  `;

  connectedCallback() {
    super.connectedCallback();
    
		this.input = this.shadowRoot.querySelector('input');
  	
  	if (this.props.checked !== null) {
    	this.input.checked = true;
    }
    
    this.input.addEventListener('change', (e) => {
    	if (e.target?.checked) {
      	this.setAttribute('checked', '');
      } else {
        this.removeAttribute('checked');
      }
    })
  }
  
  attributeChangedCallback(oldVal, newVal) {
    if (this.props.checked !== null) {
			
    }
  }
}