const FetchProducts = (req,res) => {
    res.status(200).json({ message: "Products route is working!" });
}

export { FetchProducts };