export const pagination = (req: { page?: number; per_page?: number }) => {
  let perPage = 10;
  let page = 1;

  if (req.per_page) perPage = req.per_page;
  if (req.page) page = req.page;

  const take = Number(perPage);
  const skip = (Number(page) - 1) * take;

  return { take, skip };
};
