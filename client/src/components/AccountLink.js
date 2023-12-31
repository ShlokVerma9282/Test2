import React from 'react';
import { Link } from 'react-router-dom'
import { Dropdown, ButtonGroup, Image, Button } from 'react-bootstrap'
import { yin_yang_gradient } from '../graphics';
import { mainScreens } from '../const'

class AccountLink extends React.Component {

    handleLogOutAccount = () => {
        if(this.props.user.hosting && !this.props.isHostLoggingOut){
            this.props.showHostLoggingOutModal();
        }
        else{
            this.props.axiosWrapper.axiosGet('/auth/logout', (function(res, data) {
                if (data.success) {
                    this.props.handleLogOut()
                    this.props.history.push("/login")
                }
                
            }).bind(this), true)
        }
        
    }

    setImage = (image) => {
        return 'data:' + image.contentType + ';base64,' + btoa(image.data);
    }

    render() {
        if (this.props.auth) {
            return (
                <Dropdown id="tab-component-account-link-container" as={ButtonGroup}>
                    <div id="tab-component-account-link-username" className="subtitle color-accented">{this.props.user.username}</div>
                    <Button id="tab-component-account-link-button">
                        <div onClick={() => this.props.switchScreen(mainScreens.PROFILE, this.props.user._id)}>
                            <Image id="tab-component-account-link-image" src={this.props.user.image && this.props.user.image.data ? this.setImage(this.props.user.image) : yin_yang_gradient} />
                        </div>
                    </Button>
                    <Dropdown.Toggle split id="tab-component-account-link-dropdown-button" />
                    <Dropdown.Menu id="tab-component-account-link-dropdown-menu">
                        <Dropdown.Item as={Button} onClick={() => this.props.switchScreen(mainScreens.PROFILE, this.props.user._id)}>
                            Profile
                        </Dropdown.Item>
                        <Dropdown.Item as={Button} onClick={() => this.props.switchScreen(mainScreens.SETTINGS)}>
                            Settings
                        </Dropdown.Item>
                        <Dropdown.Item as={Button} onClick={(e) => this.handleLogOutAccount(e)}>
                            Log Out
                        </Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
            )
        }
        else {
            return (
                <Link id="tab-component-login-button" className="subtitle color-accented" to="/login">Login/Sign-Up</Link>
            )
        }
    }

}

export default AccountLink;