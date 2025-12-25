import Integrations from "../models/Integrations.model.js";

/**
 * Controller to save Workday integration credentials
 * @param {*} req 
 * @param {*} res 
 */
export const workday_integration = async (req, res) => {
    try {
        const data = req.body;
        const ownerId = req.user;

        // 5 second sleep to simulate processing delay
        // await new Promise(resolve => setTimeout(resolve, 5000));
        // res.status(200).json({ success: true, message: "Workday integration saved successfully" })
        // return 0;
        // check if the user have a integration deocument alread, if yes then just add the workday part instead of creating a new document
        const existingIntegration = await Integrations.findOne({ owner: ownerId });
        if (existingIntegration) {
            // update the workday part
            existingIntegration.allIntegration.workday = {
                provider: "workday",
                tokens: {
                    username: data.username,
                    password: data.password,
                },
                updatedAt: Date.now()
            };
            await existingIntegration.save();
            return res.status(200).json({ success: true, message: "Workday integration saved successfully" })
        }

        if (data.provider === "workday") {
            const newIntegration = new Integrations({
                owner: ownerId,
                allIntegration: {
                    workday: {
                        provider: "workday",
                        tokens: {
                            username: data.username,
                            password: data.password,
                        },
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    },
                }
            })
            await newIntegration.save();
        };


        res.status(200).json({ success: true, message: "Workday integration saved successfully" })
    }
    catch (error) {
        console.log("Error in workday_integration controller", error)
        res.status(500).json({ message: "Something went wrong" })
    }
}


export const edit_workday_integration = async (req, res) => {
    try {
        const data = req.body;
        const ownerId = req.user;

        // check if the user have a integration of workday already
        const existingIntegration = await Integrations.findOne({ owner: ownerId });
        if (!existingIntegration) {
            return res.status(404).json({ message: "No existing Workday integration found for this owner" })
        }

        if (data.provider === "workday") {
            const update = {
                owner: ownerId,
                allIntegration: {
                    workday: {
                        provider: "workday",
                        tokens: {
                            username: data.username,
                            password: data.password,
                        },
                        updatedAt: new Date()
                    },
                }
            };

            // upsert
            await Integrations.findOneAndUpdate(
                { owner: ownerId },
                update,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        };

        res.status(200).json({ success: true, message: "Workday integration updated successfully" })
    }
    catch (error) {
        console.log("Error in edit_workday_integration controller", error)
        res.status(500).json({ message: "Something went wrong" })
    }
}

export const disconnect_workday_integration = async (req, res) => {
    try {
        const ownerId = req.user;
        // here i will not delete the entire intgeration document, just the workday part of it
        const integration = await Integrations.findOne({ owner: ownerId });
        if (!integration || !integration.allIntegration.workday) {
            return res.status(404).json({ message: "No Workday integration found" });
        }

        // Remove the workday integration part
        integration.allIntegration.workday = {};
        await integration.save();

        res.status(200).json({ success: true, message: "Workday integration disconnected successfully" });
    } catch (error) {
        console.log("Error in disconnect_workday_integration controller", error)
        res.status(500).json({ message: "Something went wrong" })
    }
}