import React, { useState } from "react";
import { FunctionComponent } from "react";
import { Button, Form, InputNumber, DatePicker, Select, Row, Col, Radio } from "antd";
import moment from "moment";
import "../styles.css"
import { ethers } from "ethers";
import notification, { NotificationPlacement } from "antd/lib/notification";
import { parseUnits, parseEther } from "ethers/lib/utils";
import { displayErrorMessage } from "../functions/ErrorMessage";

const ethPrice = require('eth-price');

type Params = {
    _name: string,
    _accId: string,
    _transferDate: string,
    _budget: string,
    _isParentAcc: boolean,
    contract: ethers.Contract | undefined,
}

type BtnParams = {
    id: string,
    text: string,
    height: string,
    width: string,
    padding: string,
    onClick: React.MouseEventHandler<HTMLElement>,
}

const units = ['Ether', 'Wei', 'Gwei', 'Finney', 'TRY']

const unitFactors = {
    Ether: 1000000,    //10^-18
    Wei: 1,
    Gwei: 1000,        //^-9
    Finney: 100000,     //^-15
    TRY: 1,
}

type UnitType = keyof typeof unitFactors;

const WithdrawMoney: FunctionComponent<Params> = ({ _name, _accId, _transferDate, _budget, _isParentAcc, contract }: Params) => {

    //vars
    const [form] = Form.useForm()

    const [name, setName] = useState<string>(_name)
    const [accId, setAccId] = useState<string>(_accId)
    const [transferDate, setTransferDate] = useState<string>(_transferDate)
    const [budget, setBudget] = useState<string>(_budget)

    const [leftRadioClicked, setleftRadioClicked] = useState<boolean>(true)
    const clickedRadioColor = "white"

    const [newBudget, setNewBudget] = useState<number>(0);
    const [newDate, setNewDate] = useState<Date>(new Date(0))
    var [submitUnit, setSubmitUnit] = useState<UnitType>("Ether")

    const { Option } = Select;

    const displaySaveSuccesNotification = (placement: NotificationPlacement, userMessage: string) => {
        notification.success({
            message: userMessage,
            placement,
        });
    };

    //button onClickmethods
    const onClickSave = async (e: React.MouseEvent<HTMLElement, MouseEvent>) => {

        var budgetChange: number = newBudget
        var isTry: boolean = false;

        if (submitUnit == "TRY") {
            isTry = true
            // al??nan string'i parse'lar, 27000 gibi bir de??er kal??r. sonra newbudget / 27000 de??eri i??lemi yap??l??r
            budgetChange = newBudget / parseFloat((await ethPrice('try')).toString().replace("TRY: ", "").replace(",", ".")) 
            submitUnit = "Ether"
        }

        var sentStr: string = budgetChange.toString()
        var sentValue: ethers.BigNumber = parseUnits(sentStr, submitUnit.toLowerCase())

        if (submitUnit == "Ether" && isTry) {
            submitUnit = "TRY"
        }

        if (newBudget != 0) {
            if (window.confirm('Yeni bilgileri kaydetmek istedi??inize emin misiniz?')) {

                if (leftRadioClicked) {
                    if (typeof contract !== 'undefined') {
                        contract.parentDeposit(accId, { value: sentValue })
                            .then(async (res: any) => {
                                await res.wait()
                                displaySaveSuccesNotification('bottomRight', 'Para yat??r??ld??.')
                                const addition = (parseFloat(budget) + Number(sentValue) / Number(parseEther("1"))).toString()
                                setBudget(addition)
                            })
                            .catch((err: any) => {
                                let result = `${err.reason}`.toString()
                                const desc = displayErrorMessage(result.substring(result.indexOf(":")+1, (result.length)))
                                notification['error']({
                                  message: `??ocuk d??zenleme ba??ar??s??z.`,
                                  description: desc
                                });
                            })
                    }
                }
                else {
                    if (typeof contract !== 'undefined') {
                        contract.parentWithdraw(accId, sentValue)
                            .then(async (res: any) => {
                                await res.wait()
                                displaySaveSuccesNotification('bottomRight', 'Para ??ekildi.')
                                const subtraction = (parseFloat(budget) + (-1 * Number(sentValue) / Number(parseEther("1")))).toString()
                                setBudget(subtraction)
                            })
                            .catch((err: any) => {
                                let result = `${err.reason}`.toString()
                                const desc = displayErrorMessage(result.substring(result.indexOf(":")+1, (result.length)))
                                notification['error']({
                                  message: `??ocuk d??zenleme ba??ar??s??z.`,
                                  description: desc
                                });
                            })
                    }
                }

            }
            else {
            }
        }

        try {
            if(typeof contract !== 'undefined' && newDate.getTime() !== new Date(0).getTime()){
                const resDate = await contract.changeReleaseDate(accId, (Math.floor(newDate?.getTime()/1000)))
                const resCheckDate = await resDate.wait()
                setTransferDate(new Date(newDate?.getTime()).toDateString())
                displaySaveSuccesNotification('bottomRight', 'Yeni Bilgiler Kaydedildi.')
            }

        } catch (err: any) {
            let result = `${err.reason}`.toString()
            const desc = displayErrorMessage(result.substring(result.indexOf(":")+1, (result.length)))
            notification['error']({
              message: `??ocuk d??zenleme ba??ar??s??z.`,
              description: desc
            });
        }
    }

    const onClickWithdraw = async () => {

        if (window.confirm('Varl?????? hesab??n??za ??ekmek istedi??inize emin misiniz?')) {
           
            //back-end com
            if (typeof contract !== 'undefined') {
                contract.childWithdraw()
                .then(async (res: any) => {
                    await res.wait()
                    displaySaveSuccesNotification('bottomRight', 'Para ??ekildi')
                    setBudget("0")
                })
                .catch((err: any) => {
                    let result = `${err.reason}`.toString()
                    const desc = displayErrorMessage(result.substring(result.indexOf(":")+1, (result.length)))
                    notification['error']({
                      message: `Para ??ekme ba??ar??s??z.`,
                      description: desc
                    });
                })
            }
        }
        else {
        }


    }

    //input onChange methods
    const onBudgetChange = (e: number) => {
        setNewBudget(e)
    }

    const onDateChange = (e: any, dateString: string) => {
        setNewDate(new Date(dateString))
    }

    //design components
    const getTitle = () => {
        var title: string
        var padding: string

        if (_isParentAcc) {
            title = "Varl??k ve Devir Tarihini D??zenle"
            padding = "3%"
        }
        else {
            title = "Para ??ek"
            padding = "10px"
        }

        return (
            <Row justify="center" className="child-header" style={{ paddingTop: "40px", paddingBottom: "40px", paddingRight: padding }}>
                {title}
            </Row>
        )
    }

    const getRow = (leftStr: string, rightStr: string) => {
        return (
            <Form.Item
                label={<div className="child-left-text"> {leftStr} </div>}
            >
                <div className="child-text"> {rightStr} </div>
            </Form.Item>
        );
    }

    const btnParams: BtnParams = {
        id: _isParentAcc ? "parent-btn" : "child-btn",
        text: _isParentAcc ? "Kaydet" : "Paray?? ??ek",
        height: _isParentAcc ? "60px" : "65px",
        width: _isParentAcc ? "120px" : "130px",
        padding: _isParentAcc ? "30px" : "25px",
        onClick: _isParentAcc ? onClickSave : onClickWithdraw,
    }

    const formLayout = {
        labelCol: { span: 8 },
        wrapperCol: { span: 16 },
    };

    //desing
    return (
        <div style={{height:"100vh"}}>
            {getTitle()}
            <div className="edit-form">
            <Form {...formLayout}
                form={form}
                initialValues={{ remember: true }}
                autoComplete="off"
                colon={false}
            >
                <br></br>

                {getRow("??sim Soyisim :", name)}
                {getRow("Hesap ID :", accId)}
                {getRow("Devir Tarihi :", transferDate)}
                {getRow("Varl??k Miktar?? :", budget + " ETH")}

                {_isParentAcc &&
                    <div>
                        <Form.Item
                            label={<div className="child-left-text"> Yeni Miktar : </div>}
                            labelAlign="right"
                        >
                            <Col>
                                <Row>
                                    <InputNumber
                                        id="transfer-amount" min={0}
                                        style={{ width: "140px", borderRadius: "10px" }}
                                        defaultValue={0}
                                        onChange={(e) => e != null ? onBudgetChange(+e.valueOf()) : onBudgetChange(0)}
                                    />
                                    <Select defaultValue={"Ether"} style={{ width: 100, paddingLeft: "10px", borderRadius: "10px" }}
                                        onChange={(unit: UnitType) => { setSubmitUnit(unit) }}
                                    >
                                        {units.map(unit => (
                                            <Option key={unit}>{unit}</Option>
                                        ))}
                                    </Select>
                                </Row>
                                <Row style={{ paddingTop: "10px" }}>
                                    <Radio.Group style={{ width: "140px"}}>
                                        <Radio.Button
                                            style={{ color: "black", backgroundColor: leftRadioClicked ? "#8AC926":clickedRadioColor, width: "70px",borderTopLeftRadius: "10px", borderBottomLeftRadius: "10px", borderColor:"white", boxShadow:"unset" }}
                                            value="large" onClick={() => { setleftRadioClicked(true) }}
                                        >
                                            Ekle
                                        </Radio.Button>
                                        <Radio.Button
                                            style={{ color: "black", backgroundColor: leftRadioClicked ? clickedRadioColor:"#E45C3A", width: "70px", borderTopRightRadius: "10px", borderBottomRightRadius: "10px", borderColor:"white", boxShadow:"unset" }}
                                            value="large" onClick={() => { setleftRadioClicked(false) }}
                                        >
                                            ????kar
                                        </Radio.Button>
                                    </Radio.Group>
                                </Row>
                            </Col>
                        </Form.Item>

                        <Form.Item
                            label={<div className="child-left-text"> Yeni Devir Tarihi : </div>}
                            labelAlign="right"
                        >
                            <DatePicker id="transfer-date"
                                defaultValue={moment(transferDate)}
                                allowClear={false} style={{ width: "140px", borderRadius:"10px" }}
                                onChange={(e: any, dateString: string) => onDateChange(e, dateString)}   
                            />
                        </Form.Item>
                    </div>
                }

                <Form.Item
                    wrapperCol={{ ...formLayout.wrapperCol, offset: 7 }}
                    style={{ paddingTop: btnParams.padding, paddingBottom:"5%" }}
                >
                    <Button id="child-add-btn" onClick={btnParams.onClick} type="primary"
                        className="child-add-btn">
                        {btnParams.text}
                    </Button>

                </Form.Item>

            </Form>
            </div>       
        </div>
    );
}

export default WithdrawMoney;