import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../index';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload template
router.post('/', upload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'inside', maxCount: 1 },
    { name: 'back', maxCount: 1 }
]), async (req, res) => {
    try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const { name, config, user_id } = req.body;

        if (!files.front || !name || !user_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const uploadFile = async (file: Express.Multer.File) => {
            const path = `templates/${Date.now()}_${file.originalname}`;
            const { data, error } = await supabase.storage
                .from('assets') // bucket name
                .upload(path, file.buffer, { contentType: file.mimetype });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('assets')
                .getPublicUrl(path);

            return publicUrl;
        };

        const frontUrl = await uploadFile(files.front[0]);
        const insideUrl = files.inside ? await uploadFile(files.inside[0]) : null;
        const backUrl = files.back ? await uploadFile(files.back[0]) : null;

        const { data, error } = await supabase
            .from('templates')
            .insert({
                user_id,
                name,
                front_image_url: frontUrl,
                inside_image_url: insideUrl,
                back_image_url: backUrl,
                config: JSON.parse(config || '{}')
            })
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/', async (req, res) => {
    const { user_id } = req.query;
    const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', user_id);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

export const templateRouter = router;
