import Artist from "../data/models/Artist.js";
import Song from "../data/models/Song.js";
import Fan from "../data/models/Fan.js";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import {signer, suiClient} from "../middleware/suiClient.js";
import { emitSongListed } from "../utils/websocket.js";

export const login = async (req, res) => {
    try {
        const { address, role } = req.body;
        if (!address || !role) {
            return res.status(400).json({ error: "Missing authentication information" });
        }
        const artistExists = await Artist.findOne({ suiAddress: address });
        const fanExists = await Fan.findOne({ suiAddress: address });

        if (artistExists && fanExists) {
            return res.status(400).json({ error: "Address already exists as both fan and artist" });}

        let user = undefined;

        if (role === "ARTIST") {
            if (fanExists) {
                return res.status(400).json({ error: "This wallet is already registered as a fan" });
            }
            user = artistExists
                ? artistExists
                : await Artist.create({ suiAddress: address });
        } else if (role === "FAN") {
            if (artistExists) {
                return res.status(400).json({ error: "This wallet is already registered as an artist" });
            }
            user = fanExists
                ? fanExists
                : await Fan.create({ suiAddress: address });
        } else {
            return res.status(400).json({ error: "Invalid role" });
        }
        return res.status(200).json({
            message: "Login successful",
            role,
            user,
        });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};
//
// export const verifyArtist = async (req, res) => {
//     try {
//
//         const {artistId,email,stageName,distributorLink} = req.body;
//
//         if (!email || !distributorLink || !email.includes("@") || !stageName) {
//             return res.status(400).json({error: "These fields are required"});
//         }
//         const artist = await Artist.findById(artistId);
//         if (!artist) {
//             return res.status(404).json({error: "Artist not found"});}
//         if (artist.verificationStatus === Status.APPROVED) {
//             return res.status(400).json({error: "Artist is already verified"});}
//         if (artist.verificationStatus === Status.PENDING) {
//             artist.distributorLink = distributorLink;
//             artist.verificationStatus = Status.PENDING;
//             await artist.save();
//             res.json({success: true, message: "Verification submitted successfully",artist});
//         }else{
//             return res.status(400).json({error: "Artist is already verified"});}
//     } catch (error) {
//         console.error("Error verifying artist:", error);
//         res.status(500).json({success: false, error: "Internal server error"});
//     }
// };
export const listSong = async (req, res) =>{
    try{
        const{artistId,percentage}= req.body;
        const artist = await Artist.findById(artistId);
        if (!artist) {
            return res.status(404).json({error: "Artist not found"});}
        const foundSong  = await Song.findOne({artistId: artistId});
        if (!foundSong) {
            const newSong = new Song({
                royaltyPercentage: percentage,
                artistId: artistId,
            })
            if (!artistId || !percentage) {
                return res.status(400).json({error: "artistId and percentage are required"});
            }
            if (percentage < 1 || percentage > 100) {
                return res.status(400).json({error: "Percentage should not exceed 100 or less than 1"});
            }
            if (foundSong) {
                return res.status(400).json({error: "Song already exists"});
            }

            const tx = new TransactionBlock();

            tx.moveCall({
                target: "0x20870de7263ba7f2d0271b367e575a4617861935b6850e0829bbecb8cd0b5fb6::songtoken::mint_artist_token",
                arguments: [
                    tx.object("0xa165d5dbd9ab5ecb27959ccc97a1fbb1133126d3b622c230e1e44f66e35ff2e7"),
                    tx.pure.u64(percentage),
                ],
            });
            const result = await suiClient.signAndExecuteTransactionBlock({
                signer,
                transactionBlock: tx,
                options: { showEffects: true },
            });
            await newSong.save();
            
            // Emit real-time update to all connected fans
            const io = req.app.get('io');
            if (io) {
                emitSongListed(io, {
                    song: newSong,
                    artist: {
                        _id: artist._id,
                        suiAddress: artist.suiAddress,
                        stageName: artist.stageName
                    },
                    timestamp: new Date()
                });
            }
            
            res.json({success: true, message: "Song listed successfully", newSong});
            return result
        }
        else{
            return res.status(400).json({error: "Song already exists, Try listing another song"});
        }
    }catch (err){
        console.error("Error listing song:", err);
        res.status(500).json({success: false, error: "Internal server error"});
    }
};
export default {login, listSong};